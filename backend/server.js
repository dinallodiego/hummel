const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const multer = require("multer");

const app = express();

app.use(cors());
app.use(express.json());

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

/* TEST */

app.get("/", (req, res) => {
  res.send("Backend funcionando");
});

/* PRODUCTOS ACTIVOS Y DESTACADOS (HOME) */
app.get("/productos-activos-destacados", (req, res) => {
  const sql = `
  SELECT 
    p.id,
    p.nombre,
    p.descripcion,
    p.precio,
    p.categoria_id,
    p.genero_id,
    p.disponible,
    p.destacado,
    c.nombre AS categoria,
    g.nombre AS genero
  FROM productos p
  LEFT JOIN categorias c ON p.categoria_id = c.id
  LEFT JOIN generos g ON p.genero_id = g.id
  WHERE p.disponible = true AND p.destacado = true
  `;

  db.query(sql, (err, productos) => {
    if (err) {
      res.status(500).json(err);
      return;
    }

    if (productos.length === 0) {
      res.json([]);
      return;
    }

    let productosFinal = [];
    let pendientes = productos.length;

    productos.forEach((producto) => {
      db.query(
        `SELECT id,url FROM producto_imagenes WHERE producto_id=?`,
        [producto.id],
        (err, imagenes) => {
          db.query(
            `
            SELECT t.id,t.nombre
            FROM producto_talles pt
            JOIN talles t ON pt.talle_id=t.id
            WHERE pt.producto_id=? AND pt.disponible=1
            `,
            [producto.id],
            (err, talles) => {
              db.query(
                `
                SELECT c.id,c.nombre
                FROM producto_colores pc
                JOIN colores c ON pc.color_id=c.id
                WHERE pc.producto_id=? AND pc.disponible=1
                `,
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

                  if (pendientes === 0) {
                    res.json(productosFinal);
                  }
                },
              );
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
    p.id,
    p.nombre,
    p.descripcion,
    p.precio,
    p.categoria_id,
    p.genero_id,
    p.disponible,
    p.destacado,
    c.nombre AS categoria,
    g.nombre AS genero
  FROM productos p
  LEFT JOIN categorias c ON p.categoria_id = c.id
  LEFT JOIN generos g ON p.genero_id = g.id
  WHERE p.disponible = true
  `;

  db.query(sql, (err, productos) => {
    if (err) {
      res.status(500).json(err);
      return;
    }

    if (productos.length === 0) {
      res.json([]);
      return;
    }

    let productosFinal = [];
    let pendientes = productos.length;

    productos.forEach((producto) => {
      db.query(
        `SELECT id,url FROM producto_imagenes WHERE producto_id=?`,
        [producto.id],
        (err, imagenes) => {
          db.query(
            `
            SELECT t.id,t.nombre
            FROM producto_talles pt
            JOIN talles t ON pt.talle_id=t.id
            WHERE pt.producto_id=? AND pt.disponible=1
            `,
            [producto.id],
            (err, talles) => {
              db.query(
                `
                SELECT c.id,c.nombre
                FROM producto_colores pc
                JOIN colores c ON pc.color_id=c.id
                WHERE pc.producto_id=? AND pc.disponible=1
                `,
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

                  if (pendientes === 0) {
                    res.json(productosFinal);
                  }
                },
              );
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
    p.id,
    p.nombre,
    p.descripcion,
    p.precio,
    p.categoria_id,
    p.genero_id,
    p.disponible,
    p.destacado,
    c.nombre AS categoria,
    g.nombre AS genero
  FROM productos p
  LEFT JOIN categorias c ON p.categoria_id = c.id
  LEFT JOIN generos g ON p.genero_id = g.id
  `;

  db.query(sql, (err, productos) => {
    if (err) {
      res.status(500).json(err);
      return;
    }

    if (productos.length === 0) {
      res.json([]);
      return;
    }

    let productosFinal = [];
    let pendientes = productos.length;

    productos.forEach((producto) => {
      db.query(
        `SELECT id,url FROM producto_imagenes WHERE producto_id=?`,
        [producto.id],
        (err, imagenes) => {
          db.query(
            `
            SELECT t.id,t.nombre
            FROM producto_talles pt
            JOIN talles t ON pt.talle_id=t.id
            WHERE pt.producto_id=?
            `,
            [producto.id],
            (err, talles) => {
              db.query(
                `
                SELECT c.id,c.nombre
                FROM producto_colores pc
                JOIN colores c ON pc.color_id=c.id
                WHERE pc.producto_id=?
                `,
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

                  if (pendientes === 0) {
                    res.json(productosFinal);
                  }
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
  const { nombre, descripcion, precio, categoria_id, genero_id } = req.body;

  const sql = `
  INSERT INTO productos
  (nombre,descripcion,precio,categoria_id,genero_id,disponible,destacado)
  VALUES(?,?,?,?,?,true,false)
  `;

  db.query(
    sql,
    [nombre, descripcion, precio, categoria_id, genero_id],
    (err, result) => {
      if (err) {
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
  const { nombre, descripcion, precio, categoria_id, genero_id } = req.body;

  const sql = `
  UPDATE productos
  SET nombre=?,descripcion=?,precio=?,categoria_id=?,genero_id=?
  WHERE id=?
  `;

  db.query(
    sql,
    [nombre, descripcion, precio, categoria_id, genero_id, id],
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

app.post("/pedidos", upload.single("comprobante"), (req, res) => {
  const { nombre, dni, telefono, correo, envio, total, productos } = req.body;

  const idPedido = generarIdPedido();

  const comprobantePath = req.file ? "/uploads/" + req.file.filename : null;

  const sqlPedido = `
    INSERT INTO pedidos 
    (id_pedido, nombre, dni, telefono, correo, envio, total, estado, comprobante)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente', ?)
  `;

  db.query(
    sqlPedido,
    [idPedido, nombre, dni, telefono, correo, envio, total, comprobantePath],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json(err);
      }

      const pedidoId = result.insertId;

      const productosParsed = JSON.parse(productos);

      productosParsed.forEach((p) => {
        db.query(
          `INSERT INTO pedido_productos 
          (pedido_id, producto_id, nombre, precio, cantidad, talle, color)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [pedidoId, p.id, p.nombre, p.precio, p.cantidad, p.talle, p.color],
        );
      });

      res.json({
        mensaje: "Pedido creado",
        id_pedido: idPedido,
      });
    },
  );
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

app.put("/pedidos/:id/aceptar", (req, res) => {
  const { id } = req.params;

  db.query(
    `UPDATE pedidos SET estado='aceptado', mensaje=NULL WHERE id=?`,
    [id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ mensaje: "Pedido aceptado" });
    },
  );
});
/* RECHAZAR PEDIDOS*/
app.put("/pedidos/:id/rechazar", (req, res) => {
  const { id } = req.params;
  const { mensaje } = req.body;

  db.query(
    `UPDATE pedidos SET estado='rechazado', mensaje=? WHERE id=?`,
    [mensaje, id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ mensaje: "Pedido rechazado" });
    },
  );
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

// Buscar pedido por DNI o ID
app.get("/pedidos/buscar/:dato", (req, res) => {
  const { dato } = req.params;

  const sql = `
    SELECT * FROM pedidos 
    WHERE dni=? OR id_pedido=?
  `;

  db.query(sql, [dato, dato], (err, pedidos) => {
    if (err) return res.status(500).json(err);

    if (pedidos.length === 0) return res.json({ encontrado: false });

    const pedido = pedidos[0];

    // Traemos los productos del pedido
    db.query(
      `SELECT * FROM pedido_productos WHERE pedido_id = ?`,
      [pedido.id],
      (err, productos) => {
        if (err) return res.status(500).json(err);

        res.json({
          encontrado: true,
          pedido: {
            ...pedido,
            productos,
          },
        });
      },
    );
  });
});
/* SERVIDOR */

app.listen(3000, () => {
  console.log("Servidor corriendo en puerto 3000");
});
