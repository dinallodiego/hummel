require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { createClient } = require("@supabase/supabase-js");

const app = express();

/* ================== CONFIG ================== */

app.use(
  cors({
    origin: ["http://localhost:4200"],
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

/* ================== MULTER MEMORY ================== */

const upload = multer({
  storage: multer.memoryStorage(),
});

/* ================== STORAGE ================== */

async function subirImagenSupabase(file) {
  const fileExt = file.originalname.split(".").pop();
  const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;

  const { error } = await supabase.storage
    .from("productos")
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
    });

  if (error) throw error;

  const { data } = supabase.storage.from("productos").getPublicUrl(fileName);

  return data.publicUrl;
}

/* ================== HELPERS ================== */

function generarIdPedido() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "HUM-";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/* ================== AUTH ================== */

function requireAdmin(req, res, next) {
  try {
    const token = req.cookies.admin_token;
    if (!token) return res.status(401).json({ ok: false });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ ok: false });
  }
}

/* ================== TEST ================== */

app.get("/", (req, res) => {
  res.send("Backend Supabase + Storage funcionando 🚀");
});

/* ================== LOGIN ================== */

app.post("/admin/login", async (req, res) => {
  try {
    let { email, password } = req.body;

    email = String(email || "")
      .trim()
      .toLowerCase();
    password = String(password || "").trim();

    const { data: users, error } = await supabase
      .from("admin_users")
      .select("*")
      .eq("email", email)
      .limit(1);

    if (error) throw error;
    if (!users.length) return res.status(401).json({ ok: false });

    const user = users[0];

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ ok: false });

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.cookie("admin_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    });

    res.json({ ok: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "login_error" });
  }
});

app.post("/admin/logout", (req, res) => {
  res.clearCookie("admin_token");
  res.json({ ok: true });
});

/* ================== PRODUCTOS ================== */

app.get("/productos-activos", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("productos")
      .select(
        `
        *,
        categorias(nombre),
        generos(nombre),
        producto_imagenes(url),
        producto_talles(talles(nombre)),
        producto_colores(colores(nombre))
      `,
      )
      .eq("disponible", true);

    if (error) throw error;

    const productos = data.map((p) => ({
      ...p,
      categoria: p.categorias?.nombre,
      genero: p.generos?.nombre,
      imagen: p.producto_imagenes?.[0]?.url || null,
      imagenes: p.producto_imagenes?.map((i) => i.url) || [],
      talles: p.producto_talles?.map((t) => t.talles.nombre) || [],
      colores: p.producto_colores?.map((c) => c.colores.nombre) || [],
    }));

    res.json(productos);
  } catch (err) {
    res.status(500).json(err);
  }
});

/* CREAR PRODUCTO (CON IMÁGENES EN SUPABASE) */
app.post("/productos", upload.array("imagenes", 10), async (req, res) => {
  try {
    const { nombre, descripcion, precio, categoria_id, genero_id } = req.body;

    // 1. Crear producto
    const { data, error } = await supabase
      .from("productos")
      .insert([
        {
          nombre,
          descripcion,
          precio,
          categoria_id,
          genero_id,
          disponible: true,
        },
      ])
      .select();

    if (error) throw error;

    const productoId = data[0].id;

    // 2. Subir imágenes a Supabase Storage
    if (req.files) {
      for (const file of req.files) {
        const url = await subirImagenSupabase(file);

        await supabase.from("producto_imagenes").insert([
          {
            producto_id: productoId,
            url,
          },
        ]);
      }
    }

    res.json({ ok: true, id: productoId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "error_creando_producto" });
  }
});

/* ================== PEDIDOS ================== */

app.post("/pedidos", async (req, res) => {
  try {
    const {
      nombre,
      dni,
      telefono,
      correo,
      envio,
      direccion,
      total,
      productos,
    } = req.body;

    const idPedido = generarIdPedido();
    const productosParsed = JSON.parse(productos);

    const { data, error } = await supabase
      .from("pedidos")
      .insert([
        {
          id_pedido: idPedido,
          nombre,
          dni,
          telefono,
          correo,
          envio,
          direccion,
          total,
          estado: "pendiente",
        },
      ])
      .select();

    if (error) throw error;

    const pedidoId = data[0].id;

    for (const p of productosParsed) {
      await supabase.from("pedido_productos").insert([
        {
          pedido_id: pedidoId,
          producto_id: p.id,
          nombre: p.nombre,
          precio: p.precio,
          cantidad: p.cantidad,
          talle: p.talle,
          color: p.color,
        },
      ]);
    }

    res.json({
      mensaje: "Pedido creado",
      id_pedido: idPedido,
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

/* ================== PEDIDOS ADMIN ================== */

app.get("/pedidos", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("pedidos")
      .select(`*, pedido_productos(*)`)
      .order("id", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json(err);
  }
});

app.put("/pedidos/:id/aceptar", async (req, res) => {
  await supabase
    .from("pedidos")
    .update({ estado: "aceptado" })
    .eq("id", req.params.id);

  res.json({ ok: true });
});

app.put("/pedidos/:id/rechazar", async (req, res) => {
  await supabase
    .from("pedidos")
    .update({ estado: "rechazado" })
    .eq("id", req.params.id);

  res.json({ ok: true });
});

/* ================== LISTAS ================== */

app.get("/categorias", async (req, res) => {
  const { data } = await supabase.from("categorias").select("*");
  res.json(data);
});

app.get("/generos", async (req, res) => {
  const { data } = await supabase.from("generos").select("*");
  res.json(data);
});

app.get("/talles", async (req, res) => {
  const { data } = await supabase.from("talles").select("*");
  res.json(data);
});

app.get("/colores", async (req, res) => {
  const { data } = await supabase.from("colores").select("*");
  res.json(data);
});

/* ================== SERVER ================== */

app.listen(3000, () => {
  console.log("Servidor Supabase + Storage corriendo en puerto 3000 🚀");
});
