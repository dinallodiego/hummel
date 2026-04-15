require("dotenv").config();
console.log("JWT_SECRET cargado:", process.env.JWT_SECRET);
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();

app.use(
  cors({
    origin: ["http://localhost:4200"],
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

/* CONEXION MYSQL */

const db = mysql.createConnection({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "diego1010",
  database: "hummel_store",
});

db.connect((err) => {
  if (err) {
    console.log("Error conectando MySQL:", err);
    return;
  }
  console.log("Conectado a MySQL");
});

/* STORAGE IMAGENES */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

app.use("/uploads", express.static("uploads"));

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ADMIN_PHONE = process.env.WHATSAPP_ADMIN_PHONE;
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v22.0";
const WHATSAPP_DEFAULT_COUNTRY_CODE =
  process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || "54";

function normalizarTelefonoWhatsapp(telefono) {
  if (!telefono) return null;

  let digits = String(telefono).replace(/\D/g, "");

  if (!digits) return null;

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith(WHATSAPP_DEFAULT_COUNTRY_CODE)) {
    return digits;
  }

  return `${WHATSAPP_DEFAULT_COUNTRY_CODE}${digits}`;
}

function construirDetalleProductos(productos) {
  return productos
    .map((producto) => {
      const talle = producto.talle ? ` | Talle: ${producto.talle}` : "";
      const color = producto.color ? ` | Color: ${producto.color}` : "";

      return `- ${producto.nombre} x${producto.cantidad}${talle}${color} | $${producto.precio}`;
    })
    .join("\n");
}

function construirMensajeNuevoPedido(pedido, productos) {
  const direccion = pedido.direccion ? pedido.direccion : "Retiro en local";

  return [
    "Nuevo pedido pendiente en Hummel Store",
    `Pedido: ${pedido.id_pedido}`,
    `Cliente: ${pedido.nombre}`,
    `DNI: ${pedido.dni}`,
    `Telefono: ${pedido.telefono}`,
    `Correo: ${pedido.correo}`,
    `Entrega: ${pedido.envio}`,
    `Direccion: ${direccion}`,
    `Total: $${pedido.total}`,
    "",
    "Detalle:",
    construirDetalleProductos(productos),
  ].join("\n");
}

function construirMensajePedidoAceptado(pedido, productos) {
  return [
    `Hola ${pedido.nombre}, tu pedido ${pedido.id_pedido} fue aceptado.`,
    "En breve nos comunicamos para coordinar la entrega.",
    "",
    "Detalle:",
    construirDetalleProductos(productos),
    `Total: $${pedido.total}`,
  ].join("\n");
}

function construirMensajePedidoRechazado(pedido, productos) {
  const motivo = pedido.mensaje
    ? `Motivo: ${pedido.mensaje}`
    : "Motivo: Sin detalle";

  return [
    `Hola ${pedido.nombre}, tu pedido ${pedido.id_pedido} fue rechazado.`,
    motivo,
    "",
    "Si queres, podes responder este mensaje para revisarlo.",
    "",
    "Detalle:",
    construirDetalleProductos(productos),
    `Total: $${pedido.total}`,
  ].join("\n");
}

async function enviarWhatsappTexto(telefono, mensaje) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.warn(
      "WhatsApp no configurado: faltan WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID.",
    );
    return { sent: false, reason: "missing_config" };
  }

  const telefonoNormalizado = normalizarTelefonoWhatsapp(telefono);

  if (!telefonoNormalizado) {
    console.warn("WhatsApp no enviado: telefono invalido.");
    return { sent: false, reason: "invalid_phone" };
  }

  const response = await fetch(
    `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: telefonoNormalizado,
        type: "text",
        text: {
          preview_url: false,
          body: mensaje,
        },
      }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`WhatsApp API error: ${JSON.stringify(data)}`);
  }

  return { sent: true, data };
}

function notificarWhatsapp(telefono, mensaje, contexto) {
  return enviarWhatsappTexto(telefono, mensaje).catch((error) => {
    console.error(`Error enviando WhatsApp (${contexto}):`, error.message);
    return { sent: false, reason: "api_error" };
  });
}

async function obtenerPedidoConProductos(id) {
  const [pedidos] = await db
    .promise()
    .query("SELECT * FROM pedidos WHERE id = ?", [id]);

  if (!pedidos.length) {
    return null;
  }

  const [productos] = await db
    .promise()
    .query("SELECT * FROM pedido_productos WHERE pedido_id = ?", [id]);

  return {
    ...pedidos[0],
    productos,
  };
}

/* TEST */

app.get("/", (req, res) => {
  res.send("Backend funcionando");
});

/* LOGIN ADMIN */
app.post("/admin/login", async (req, res) => {
  try {
    let { email, password } = req.body || {};

    email = String(email || "").trim();
    password = String(password || "").trim();

    console.log("LOGIN body:", req.body);
    console.log("LOGIN email:", JSON.stringify(email));
    console.log("LOGIN pass length:", password.length);

    // Limpia formato: [x](mailto:x)
    const mailto = email.match(/mailto:([^)\s]+)/i);
    if (mailto && mailto[1]) email = mailto[1];

    // Limpia formato: [email]...
    const bracket = email.match(/^\[([^\]]+)\]/);
    if (bracket && bracket[1]) email = bracket[1];

    email = email.trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "missing_credentials" });
    }

    const [rows] = await db
      .promise()
      .query(
        "SELECT id, email, password_hash, role, active FROM admin_users WHERE email = ? LIMIT 1",
        [email],
      );

    console.log("LOGIN rows found:", rows.length);
    if (rows.length) console.log("LOGIN db email:", rows[0].email);

    if (!rows.length) {
      return res.status(401).json({ ok: false, error: "invalid_credentials" });
    }

    const user = rows[0];

    // 🔥 AHORA SÍ
    console.log("HASH DB:", user.password_hash);
    console.log("PASSWORD INGRESADA:", password);

    if (!user.active) {
      return res.status(403).json({ ok: false, error: "inactive_user" });
    }

    const match = await bcrypt.compare(password, user.password_hash);

    console.log("LOGIN bcrypt match:", match);

    if (!match) {
      return res.status(401).json({ ok: false, error: "invalid_credentials" });
    }
    console.log("JWT_SECRET:", process.env.JWT_SECRET);
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ ok: false, error: "missing_jwt_secret" });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );

    res.cookie("admin_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    });

    return res.json({
      ok: true,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (e) {
    console.error("ADMIN LOGIN ERROR:", e);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
});
/* ADMIN LOGOUT */
app.post("/admin/logout", (req, res) => {
  res.clearCookie("admin_token", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
  });

  res.json({ ok: true });
});

function requireAdmin(req, res, next) {
  try {
    const token = req.cookies.admin_token;
    if (!token)
      return res.status(401).json({ ok: false, error: "unauthorized" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
}
app.get("/admin/me", requireAdmin, (req, res) => {
  res.json({ ok: true, admin: req.admin });
});

/* PRODUCTOS ACTIVOS Y DESTACADOS (HOME) */
app.get("/productos-activos-destacados", (req, res) => {
  const sql = `
    SELECT
      p.id, p.nombre, p.descripcion, p.precio, p.categoria_id, p.genero_id,
      p.disponible, p.destacado, p.tiene_descuento, p.descuento_valor, p.tipo_descuento, p.descuento_cantidad,
      c.nombre AS categoria, g.nombre AS genero
    FROM productos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    LEFT JOIN generos g ON p.genero_id = g.id
    WHERE p.disponible = true AND p.destacado = true
  `;

  db.query(sql, (err, productos) => {
    if (err) return res.status(500).json(err);
    if (!productos || productos.length === 0) return res.json([]);

    const productosFinal = [];
    let pendientes = productos.length;

    productos.forEach((producto) => {
      db.query(
        `SELECT id, url FROM producto_imagenes WHERE producto_id = ?`,
        [producto.id],
        (err, imagenes) => {
          if (err) return res.status(500).json(err);
          imagenes = imagenes || [];

          // Determinar tipo de talle según categoria (robusto a mayúsculas)
          const categoriaNombre = String(producto.categoria || "")
            .trim()
            .toLowerCase();

          let tipoTalle = null;
          if (categoriaNombre === "calzado") tipoTalle = "calzado";
          else if (categoriaNombre === "indumentaria")
            tipoTalle = "indumentaria";
          else tipoTalle = null; // accesorio u otros => sin talles

          const cargarColoresYResponder = (talles) => {
            db.query(
              `SELECT
                 c.id,
                 c.nombre,
                 CASE WHEN pc.disponible = 1 THEN 1 ELSE 0 END AS disponible
               FROM colores c
               LEFT JOIN producto_colores pc
                 ON pc.color_id = c.id
                 AND pc.producto_id = ?`,
              [producto.id],
              (err, colores) => {
                if (err) return res.status(500).json(err);
                colores = colores || [];

                productosFinal.push({
                  ...producto,
                  imagen: imagenes.length ? imagenes[0].url : null,
                  imagenes: imagenes.map((i) => i.url),

                  talles: (talles || []).map((t) => ({
                    nombre: t.nombre,
                    disponible: !!t.disponible,
                  })),
                  colores: colores.map((c) => ({
                    nombre: c.nombre,
                    disponible: !!c.disponible,
                  })),

                  talles_ids: (talles || []).map((t) => t.id),
                  colores_ids: colores.map((c) => c.id),
                });

                pendientes--;
                if (pendientes === 0) res.json(productosFinal);
              },
            );
          };

          // Si no aplica talles (Accesorio, etc), seguimos con talles vacíos
          if (!tipoTalle) {
            return cargarColoresYResponder([]);
          }

          // OJO: En tu tabla talles aparece "Calzado" con mayúscula.
          // Usamos LOWER(t.tipo) para que siempre matchee.
          db.query(
            `SELECT
               t.id,
               t.nombre,
               CASE WHEN pt.disponible = 1 THEN 1 ELSE 0 END AS disponible
             FROM talles t
             LEFT JOIN producto_talles pt
               ON pt.talle_id = t.id
               AND pt.producto_id = ?
             WHERE LOWER(t.tipo) = ?`,
            [producto.id, tipoTalle],
            (err, talles) => {
              if (err) return res.status(500).json(err);
              talles = talles || [];
              return cargarColoresYResponder(talles);
            },
          );
        },
      );
    });
  });
});

/* PRODUCTOS ACTIVOS */
app.get("/productos-activos", (req, res) => {
  const sql = `
    SELECT
      p.id, p.nombre, p.descripcion, p.precio, p.categoria_id, p.genero_id,
      p.disponible, p.destacado, p.tiene_descuento, p.descuento_valor, p.tipo_descuento, p.descuento_cantidad,
      c.nombre AS categoria, g.nombre AS genero
    FROM productos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    LEFT JOIN generos g ON p.genero_id = g.id
    WHERE p.disponible = true
  `;

  db.query(sql, (err, productos) => {
    if (err) return res.status(500).json(err);
    if (!productos || productos.length === 0) return res.json([]);

    const productosFinal = [];
    let pendientes = productos.length;

    productos.forEach((producto) => {
      db.query(
        `SELECT id, url FROM producto_imagenes WHERE producto_id = ?`,
        [producto.id],
        (err, imagenes) => {
          if (err) return res.status(500).json(err);
          imagenes = imagenes || [];

          const categoriaNombre = String(producto.categoria || "")
            .trim()
            .toLowerCase();

          let tipoTalle = null;
          if (categoriaNombre === "calzado") tipoTalle = "calzado";
          else if (categoriaNombre === "indumentaria")
            tipoTalle = "indumentaria";
          else tipoTalle = null;

          const cargarColoresYResponder = (talles) => {
            db.query(
              `SELECT
                 c.id,
                 c.nombre,
                 CASE WHEN pc.disponible = 1 THEN 1 ELSE 0 END AS disponible
               FROM colores c
               LEFT JOIN producto_colores pc
                 ON pc.color_id = c.id
                 AND pc.producto_id = ?`,
              [producto.id],
              (err, colores) => {
                if (err) return res.status(500).json(err);
                colores = colores || [];

                productosFinal.push({
                  ...producto,
                  imagen: imagenes.length ? imagenes[0].url : null,
                  imagenes: imagenes.map((i) => i.url),

                  talles: (talles || []).map((t) => ({
                    nombre: t.nombre,
                    disponible: !!t.disponible,
                  })),
                  colores: colores.map((c) => ({
                    nombre: c.nombre,
                    disponible: !!c.disponible,
                  })),

                  talles_ids: (talles || []).map((t) => t.id),
                  colores_ids: colores.map((c) => c.id),
                });

                pendientes--;
                if (pendientes === 0) res.json(productosFinal);
              },
            );
          };

          if (!tipoTalle) {
            return cargarColoresYResponder([]);
          }

          db.query(
            `SELECT
               t.id,
               t.nombre,
               CASE WHEN pt.disponible = 1 THEN 1 ELSE 0 END AS disponible
             FROM talles t
             LEFT JOIN producto_talles pt
               ON pt.talle_id = t.id
               AND pt.producto_id = ?
             WHERE LOWER(t.tipo) = ?`,
            [producto.id, tipoTalle],
            (err, talles) => {
              if (err) return res.status(500).json(err);
              talles = talles || [];
              return cargarColoresYResponder(talles);
            },
          );
        },
      );
    });
  });
});

/* PRODUCTOS TOTALES (ADMIN) */
app.get("/productos", (req, res) => {
  const sql = `
  SELECT 
    p.id, p.nombre, p.descripcion, p.precio, p.categoria_id, p.genero_id,
    p.disponible, p.destacado, p.tiene_descuento, p.descuento_valor, p.tipo_descuento, p.descuento_cantidad,
    c.nombre AS categoria, g.nombre AS genero
  FROM productos p
  LEFT JOIN categorias c ON p.categoria_id = c.id
  LEFT JOIN generos g ON p.genero_id = g.id
  `;

  db.query(sql, (err, productos) => {
    if (err) return res.status(500).json(err);
    if (productos.length === 0) return res.json([]);

    let productosFinal = [];
    let pendientes = productos.length;

    productos.forEach((producto) => {
      db.query(
        `SELECT id,url FROM producto_imagenes WHERE producto_id=?`,
        [producto.id],
        (err, imagenes) => {
          db.query(
            `SELECT t.id,t.nombre FROM producto_talles pt JOIN talles t ON pt.talle_id=t.id WHERE pt.producto_id=?`,
            [producto.id],
            (err, talles) => {
              db.query(
                `SELECT c.id,c.nombre FROM producto_colores pc JOIN colores c ON pc.color_id=c.id WHERE pc.producto_id=?`,
                [producto.id],
                (err, colores) => {
                  productosFinal.push({
                    ...producto,
                    imagen: imagenes.length ? imagenes[0].url : null,
                    imagenes: imagenes.map((i) => i.url),
                    talles: talles.map((t) => t.nombre),
                    colores: colores.map((c) => c.nombre),
                    talles_ids: talles.map((t) => t.id),
                    colores_ids: colores.map((c) => c.id),
                  });

                  pendientes--;
                  if (pendientes === 0) res.json(productosFinal);
                },
              );
            },
          );
        },
      );
    });
  });
});

/* CATEGORIAS */

app.get("/categorias", (req, res) => {
  db.query("SELECT * FROM categorias WHERE disponible=true", (err, result) => {
    if (err) {
      res.status(500).json(err);
      return;
    }
    res.json(result);
  });
});

/* GENEROS */

app.get("/generos", (req, res) => {
  db.query("SELECT * FROM generos WHERE disponible=true", (err, result) => {
    if (err) {
      res.status(500).json(err);
      return;
    }
    res.json(result);
  });
});

/* TALLES */

app.get("/talles", (req, res) => {
  db.query("SELECT * FROM talles WHERE disponible=true", (err, result) => {
    if (err) {
      res.status(500).json(err);
      return;
    }
    res.json(result);
  });
});

/* COLORES */

app.get("/colores", (req, res) => {
  db.query("SELECT * FROM colores WHERE disponible=true", (err, result) => {
    if (err) {
      res.status(500).json(err);
      return;
    }
    res.json(result);
  });
});

/* CREAR PRODUCTO */
app.post("/productos", upload.array("imagenes", 10), (req, res) => {
  const {
    nombre,
    descripcion,
    precio,
    categoria_id,
    genero_id,
    tiene_descuento,
    descuento_valor,
    tipo_descuento,
    descuento_cantidad,
  } = req.body;

  const sql = `
  INSERT INTO productos
  (nombre, descripcion, precio, categoria_id, genero_id, disponible, destacado, tiene_descuento, descuento_valor, tipo_descuento, descuento_cantidad)
  VALUES(?,?,?,?,?,true,false,?,?,?,?,?)
  `;

  db.query(
    sql,
    [
      nombre,
      descripcion,
      precio,
      categoria_id,
      genero_id,
      tiene_descuento === "true" || tiene_descuento === "1" ? 1 : 0,
      descuento_valor || 0,
      tipo_descuento || "simple",
      descuento_cantidad || 0,
    ],
    (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).json(err);
        return;
      }

      const productoId = result.insertId;

      if (req.files) {
        req.files.forEach((file) => {
          db.query(
            "INSERT INTO producto_imagenes(producto_id,url) VALUES(?,?)",
            [productoId, "/uploads/" + file.filename],
          );
        });
      }

      const talles = JSON.parse(req.body.talles || "[]");
      talles.forEach((talleId) => {
        db.query(
          "INSERT INTO producto_talles(producto_id,talle_id,disponible) VALUES(?,?,true)",
          [productoId, talleId],
        );
      });

      const colores = JSON.parse(req.body.colores || "[]");
      colores.forEach((colorId) => {
        db.query(
          "INSERT INTO producto_colores(producto_id,color_id,disponible) VALUES(?,?,true)",
          [productoId, colorId],
        );
      });

      res.json({
        mensaje: "Producto creado",
        id: productoId,
      });
    },
  );
});

/* EDITAR PRODUCTO */
app.put("/productos/:id", upload.array("imagenes", 10), (req, res) => {
  const { id } = req.params;
  const {
    nombre,
    descripcion,
    precio,
    categoria_id,
    genero_id,
    tiene_descuento,
    descuento_valor,
    tipo_descuento,
    descuento_cantidad,
  } = req.body;

  const sql = `
  UPDATE productos
  SET nombre=?, descripcion=?, precio=?, categoria_id=?, genero_id=?, tiene_descuento=?, descuento_valor=? , tipo_descuento=?, descuento_cantidad=?
  WHERE id=?
  `;

  db.query(
    sql,
    [
      nombre,
      descripcion,
      precio,
      categoria_id,
      genero_id,
      tiene_descuento === "true" || tiene_descuento === "1" ? 1 : 0,
      descuento_valor || 0,
      tipo_descuento || "simple",
      descuento_cantidad || 0,
      id,
    ],
    (err) => {
      if (err) {
        res.status(500).json(err);
        return;
      }

      const talles = JSON.parse(req.body.talles || "[]");
      db.query("DELETE FROM producto_talles WHERE producto_id=?", [id]);
      talles.forEach((talleId) => {
        db.query(
          "INSERT INTO producto_talles(producto_id,talle_id,disponible) VALUES(?,?,true)",
          [id, talleId],
        );
      });

      const colores = JSON.parse(req.body.colores || "[]");
      db.query("DELETE FROM producto_colores WHERE producto_id=?", [id]);
      colores.forEach((colorId) => {
        db.query(
          "INSERT INTO producto_colores(producto_id,color_id,disponible) VALUES(?,?,true)",
          [id, colorId],
        );
      });

      res.json({ mensaje: "Producto actualizado" });
    },
  );
});

/* DESTACAR PRODUCTO (NUEVO) */

app.put("/productos/:id/destacar", (req, res) => {
  const { id } = req.params;
  const { destacado } = req.body;

  db.query(
    "UPDATE productos SET destacado=? WHERE id=?",
    [destacado, id],
    (err) => {
      if (err) {
        res.status(500).json(err);
        return;
      }
      res.json({ mensaje: "Estado de destacado actualizado" });
    },
  );
});

/* BAJA LOGICA */

app.put("/productos/:id/desactivar", (req, res) => {
  const { id } = req.params;

  db.query("UPDATE productos SET disponible=0 WHERE id=?", [id], () => {
    res.json({ mensaje: "Producto desactivado" });
  });
});

/* ALTA LOGICA */

app.put("/productos/:id/activar", (req, res) => {
  const { id } = req.params;

  db.query("UPDATE productos SET disponible=1 WHERE id=?", [id], () => {
    res.json({ mensaje: "Producto activado" });
  });
});

/* CREAR PEDIDO */

app.post("/pedidos", upload.single("comprobante"), async (req, res) => {
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
    const comprobantePath = req.file ? "/uploads/" + req.file.filename : null;
    const productosParsed = JSON.parse(productos);

    const sqlPedido = `
      INSERT INTO pedidos 
      (id_pedido, nombre, dni, telefono, correo, envio, direccion, total, estado, comprobante)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?)
    `;

    const [result] = await db
      .promise()
      .query(sqlPedido, [
        idPedido,
        nombre,
        dni,
        telefono,
        correo,
        envio,
        direccion,
        total,
        comprobantePath,
      ]);

    const pedidoId = result.insertId;

    await Promise.all(
      productosParsed.map((p) =>
        db.promise().query(
          `INSERT INTO pedido_productos 
          (pedido_id, producto_id, nombre, precio, cantidad, talle, color)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [pedidoId, p.id, p.nombre, p.precio, p.cantidad, p.talle, p.color],
        ),
      ),
    );

    const pedidoCreado = {
      id: pedidoId,
      id_pedido: idPedido,
      nombre,
      dni,
      telefono,
      correo,
      envio,
      direccion,
      total,
      estado: "pendiente",
      comprobante: comprobantePath,
    };

    if (WHATSAPP_ADMIN_PHONE) {
      const mensajeAdmin = construirMensajeNuevoPedido(
        pedidoCreado,
        productosParsed,
      );
      void notificarWhatsapp(
        WHATSAPP_ADMIN_PHONE,
        mensajeAdmin,
        `nuevo pedido ${idPedido} admin`,
      );
    }

    res.json({
      mensaje: "Pedido creado",
      id_pedido: idPedido,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

function generarIdPedido() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "HUM-";

  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

/* PEDIDOS (ADMIN) */
app.get("/pedidos", (req, res) => {
  const sql = `
    SELECT * FROM pedidos ORDER BY id DESC
  `;
  db.query(sql, (err, pedidos) => {
    if (err) return res.status(500).json(err);

    if (pedidos.length === 0) return res.json([]);

    let pedidosFinal = [];
    let pendientes = pedidos.length;

    pedidos.forEach((pedido) => {
      db.query(
        `SELECT * FROM pedido_productos WHERE pedido_id = ?`,
        [pedido.id],
        (err, productos) => {
          pedidosFinal.push({
            ...pedido,
            productos,
          });
          pendientes--;
          if (pendientes === 0) res.json(pedidosFinal);
        },
      );
    });
  });
});

/* ACEPTAR PEDIDOS*/

app.put("/pedidos/:id/aceptar", async (req, res) => {
  try {
    const { id } = req.params;

    await db
      .promise()
      .query(`UPDATE pedidos SET estado='aceptado', mensaje=NULL WHERE id=?`, [
        id,
      ]);

    const pedido = await obtenerPedidoConProductos(id);

    if (pedido) {
      const mensajeCliente = construirMensajePedidoAceptado(
        pedido,
        pedido.productos,
      );
      void notificarWhatsapp(
        pedido.telefono,
        mensajeCliente,
        `pedido aceptado ${pedido.id_pedido} cliente`,
      );
    }

    res.json({ mensaje: "Pedido aceptado" });
  } catch (err) {
    res.status(500).json(err);
  }
});
/* RECHAZAR PEDIDOS*/
app.put("/pedidos/:id/rechazar", async (req, res) => {
  try {
    const { id } = req.params;
    const { mensaje } = req.body;

    await db
      .promise()
      .query(`UPDATE pedidos SET estado='rechazado', mensaje=? WHERE id=?`, [
        mensaje,
        id,
      ]);

    const pedido = await obtenerPedidoConProductos(id);

    if (pedido) {
      const mensajeCliente = construirMensajePedidoRechazado(
        pedido,
        pedido.productos,
      );
      void notificarWhatsapp(
        pedido.telefono,
        mensajeCliente,
        `pedido rechazado ${pedido.id_pedido} cliente`,
      );
    }

    res.json({ mensaje: "Pedido rechazado" });
  } catch (err) {
    res.status(500).json(err);
  }
});

// PEDIDOS FILTRADOS POR ESTADO
app.get("/pedidos/:estado", (req, res) => {
  const { estado } = req.params; // 'pendiente', 'aceptado', 'rechazado'
  const sql = `SELECT * FROM pedidos WHERE estado=? ORDER BY id DESC`;
  db.query(sql, [estado], (err, pedidos) => {
    if (err) return res.status(500).json(err);

    if (pedidos.length === 0) return res.json([]);

    let pedidosFinal = [];
    let pendientes = pedidos.length;

    pedidos.forEach((pedido) => {
      db.query(
        `SELECT * FROM pedido_productos WHERE pedido_id = ?`,
        [pedido.id],
        (err, productos) => {
          pedidosFinal.push({ ...pedido, productos });
          pendientes--;
          if (pendientes === 0) res.json(pedidosFinal);
        },
      );
    });
  });
});

// CONTADOR DE PEDIDOS PENDIENTES PARA ADMIN GENERAL
app.get("/pedidos-pendientes/count", (req, res) => {
  const sql = `SELECT COUNT(*) AS pendientes FROM pedidos WHERE estado='pendiente'`;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result[0]);
  });
});

// Buscar pedidos por DNI o ID de pedido
app.get("/pedidos/buscar/:dato", (req, res) => {
  const { dato } = req.params;

  const esDni = /^\d+$/.test(dato);

  let sql = "";
  let params = [];

  if (esDni) {
    sql = `SELECT * FROM pedidos WHERE dni=? ORDER BY id DESC`;
    params = [dato];
  } else {
    sql = `SELECT * FROM pedidos WHERE id_pedido=?`;
    params = [dato];
  }

  db.query(sql, params, (err, pedidos) => {
    if (err) return res.status(500).json(err);

    if (pedidos.length === 0) {
      return res.json({ encontrado: false });
    }

    let pedidosFinal = [];
    let pendientes = pedidos.length;

    pedidos.forEach((pedido) => {
      db.query(
        `SELECT * FROM pedido_productos WHERE pedido_id = ?`,
        [pedido.id],
        (err, productos) => {
          pedidosFinal.push({
            ...pedido,
            productos,
          });

          pendientes--;

          if (pendientes === 0) {
            res.json({
              encontrado: true,
              pedidos: pedidosFinal,
            });
          }
        },
      );
    });
  });
});

app.get("/descargar/:file", (req, res) => {
  const file = req.params.file;
  const path = __dirname + "/uploads/" + file;

  res.download(path); // 🔥 fuerza descarga SIEMPRE
});

app.get("/ventas", (req, res) => {
  const sql = `
    SELECT 
      p.id,
      p.nombre AS cliente_nombre,
      p.telefono AS cliente_telefono,
      p.total,
      p.fecha
    FROM pedidos p
    WHERE p.estado = 'aceptado'
    ORDER BY p.id DESC
  `;

  db.query(sql, (err, ventas) => {
    if (err) return res.status(500).json(err);

    if (ventas.length === 0) return res.json([]);

    let ventasFinal = [];
    let pendientes = ventas.length;

    ventas.forEach((venta) => {
      db.query(
        `SELECT nombre, cantidad FROM pedido_productos WHERE pedido_id = ?`,
        [venta.id],
        (err, productos) => {
          const productosTexto = productos
            .map((p) => `${p.nombre} x${p.cantidad}`)
            .join(", ");

          ventasFinal.push({
            ...venta,
            productos: productosTexto,
            productos_detalle: productos,
          });

          pendientes--;

          if (pendientes === 0) {
            res.json(ventasFinal);
          }
        },
      );
    });
  });
});

// marcar como entregado
app.put("/pedidos/:id/entregado", async (req, res) => {
  try {
    const { id } = req.params;

    console.log("ID recibido:", id);

    await db
      .promise()
      .query("UPDATE pedidos SET entregado = true WHERE id_pedido = ?", [id]);

    res.json({ ok: true });
  } catch (err) {
    console.error("ERROR BACKEND:", err);
    res.status(500).json({ error: err.message });
  }
});

// marcar como NO entregado (por si te equivocás)
app.put("/pedidos/:id/no-entregado", async (req, res) => {
  const { id } = req.params;

  await db.query("UPDATE pedidos SET entregado = false WHERE  id_pedido = ?", [
    id,
  ]);

  res.json({ ok: true });
});
/* SERVIDOR */

app.listen(3000, () => {
  console.log("Servidor corriendo en puerto 3000");
});
