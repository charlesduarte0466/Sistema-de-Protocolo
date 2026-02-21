import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";

const db = new Database("protocolo.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    permissions TEXT -- JSON string of permissions
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role_id INTEGER,
    FOREIGN KEY (role_id) REFERENCES roles(id)
  );

  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    content TEXT, -- Markdown or HTML template
    created_by INTEGER,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS protocols (
    id TEXT PRIMARY KEY, -- The unique temporal ID
    title TEXT,
    description TEXT,
    doc_type TEXT, -- New field: Document Type
    data TEXT, -- JSON data if using a template
    template_id INTEGER,
    status TEXT DEFAULT 'Aberto',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (template_id) REFERENCES templates(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    protocol_id TEXT,
    filename TEXT,
    file_path TEXT,
    FOREIGN KEY (protocol_id) REFERENCES protocols(id)
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Migration: Add doc_type to protocols if it doesn't exist
try {
  db.prepare("SELECT doc_type FROM protocols LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE protocols ADD COLUMN doc_type TEXT DEFAULT 'Geral'");
}

// Seed initial data if empty
const roleCount = db.prepare("SELECT COUNT(*) as count FROM roles").get() as { count: number };
if (roleCount.count === 0) {
  db.prepare("INSERT INTO roles (name, permissions) VALUES (?, ?)").run("Admin", JSON.stringify(["all"]));
  db.prepare("INSERT INTO roles (name, permissions) VALUES (?, ?)").run("Operador", JSON.stringify(["create_protocol", "view_protocol"]));
}

const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  db.prepare("INSERT INTO users (username, password, role_id) VALUES (?, ?, ?)").run("admin", "admin123", 1);
}

const templateCount = db.prepare("SELECT COUNT(*) as count FROM templates").get() as { count: number };
if (templateCount.count === 0) {
  // Seed default templates
  const defaultTemplates = [
    { name: 'Geral', content: '<div style="font-family: sans-serif; padding: 20px;"><h1>Protocolo Geral</h1><p>{{description}}</p></div>' },
    { name: 'Ofício', content: '<div style="font-family: serif; padding: 40px; border: 1px solid #ccc;"><h2>OFÍCIO Nº {{protocol_id}}</h2><p>{{description}}</p></div>' },
    { name: 'Memorando', content: '<div style="background: #f9f9f9; padding: 20px;"><h3>MEMORANDO INTERNO</h3><hr/><p>{{description}}</p></div>' },
    { name: 'Requerimento', content: '<div style="padding: 30px;"><h1>REQUERIMENTO</h1><p>Eu, abaixo assinado, venho requerer: {{description}}</p></div>' },
    { name: 'Contrato', content: '<div style="padding: 50px; line-height: 1.6;"><h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1><p>{{description}}</p></div>' }
  ];

  for (const t of defaultTemplates) {
    db.prepare("INSERT INTO templates (name, content, created_by) VALUES (?, ?, ?)").run(t.name, t.content, 1);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // API Routes
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare(`
      SELECT u.id, u.username, r.name as role, r.permissions 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE u.username = ? AND u.password = ?
    `).get(username, password) as any;

    if (user) {
      user.permissions = JSON.parse(user.permissions);
      res.cookie("session", JSON.stringify({ id: user.id, username: user.username }), {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });

      // Log Login
      db.prepare("INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)").run(
        user.id,
        "Login",
        `Usuário ${user.username} entrou no sistema`
      );

      res.json(user);
    } else {
      res.status(401).json({ error: "Credenciais inválidas" });
    }
  });

  app.post("/api/logout", (req, res) => {
    const session = req.cookies.session;
    if (session) {
      try {
        const sessionData = JSON.parse(session);
        // Log Logout
        db.prepare("INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)").run(
          sessionData.id,
          "Logout",
          `Usuário ${sessionData.username} saiu do sistema`
        );
      } catch (e) {
        console.error("Error logging logout", e);
      }
    }

    res.clearCookie("session", {
      httpOnly: true,
      secure: true,
      sameSite: "none"
    });
    res.json({ success: true });
  });

  app.get("/api/me", (req, res) => {
    const session = req.cookies.session;
    if (!session) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    try {
      const sessionData = JSON.parse(session);
      const user = db.prepare(`
        SELECT u.id, u.username, r.name as role, r.permissions 
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE u.id = ?
      `).get(sessionData.id) as any;
      
      if (user) {
        user.permissions = JSON.parse(user.permissions);
        res.json(user);
      } else {
        res.status(401).json({ error: "Usuário não encontrado" });
      }
    } catch (e) {
      res.status(401).json({ error: "Sessão inválida" });
    }
  });

  app.get("/api/protocols", (req, res) => {
    const protocols = db.prepare("SELECT * FROM protocols ORDER BY created_at DESC").all();
    res.json(protocols);
  });

  app.post("/api/protocols", (req, res) => {
    const { title, description, template_id, created_by } = req.body;
    
    // Generate Unique Protocol: YYYYMMDDHHMMSSsss
    const now = new Date();
    const protocolId = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0') +
      now.getMilliseconds().toString().padStart(3, '0');

    try {
      // Get template name to use as doc_type
      let docType = 'Geral';
      if (template_id) {
        const template = db.prepare("SELECT name FROM templates WHERE id = ?").get(template_id) as any;
        if (template) docType = template.name;
      }

      db.prepare(`
        INSERT INTO protocols (id, title, description, doc_type, template_id, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        protocolId, 
        title, 
        description, 
        docType,
        template_id || null, 
        created_by
      );
      
      // Log action
      db.prepare("INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)").run(
        created_by, 
        "Criação de Protocolo", 
        `Protocolo ${protocolId} criado: ${title}`
      );

      res.status(201).json({ id: protocolId });
    } catch (error) {
      console.error("Erro ao criar protocolo:", error);
      res.status(500).json({ error: "Erro ao criar protocolo no banco de dados" });
    }
  });

  app.get("/api/templates", (req, res) => {
    const templates = db.prepare("SELECT * FROM templates").all();
    res.json(templates);
  });

  app.post("/api/templates", (req, res) => {
    const { name, content, created_by } = req.body;
    db.prepare("INSERT INTO templates (name, content, created_by) VALUES (?, ?, ?)").run(name, content, created_by);
    
    // Log action
    db.prepare("INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)").run(
      created_by, 
      "Criação de Modelo", 
      `Modelo criado: ${name}`
    );

    res.status(201).json({ success: true });
  });

  app.put("/api/templates/:id", (req, res) => {
    const { id } = req.params;
    const { name, content } = req.body;
    try {
      db.prepare("UPDATE templates SET name = ?, content = ? WHERE id = ?").run(name, content, id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Erro ao atualizar modelo" });
    }
  });

  app.get("/api/users", (req, res) => {
    const users = db.prepare(`
      SELECT u.id, u.username, r.name as role 
      FROM users u 
      JOIN roles r ON u.role_id = r.id
    `).all();
    res.json(users);
  });

  app.get("/api/roles", (req, res) => {
    const roles = db.prepare("SELECT * FROM roles").all();
    res.json(roles);
  });

  app.post("/api/roles", (req, res) => {
    const { name, permissions } = req.body;
    try {
      db.prepare("INSERT INTO roles (name, permissions) VALUES (?, ?)").run(name, JSON.stringify(permissions || []));
      
      // Log action (using admin as default for role creation in this mock)
      db.prepare("INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)").run(
        1, 
        "Criação de Perfil", 
        `Perfil criado: ${name}`
      );

      res.status(201).json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Perfil já existe" });
    }
  });

  app.post("/api/users", (req, res) => {
    const { username, password, role_id } = req.body;
    try {
      db.prepare("INSERT INTO users (username, password, role_id) VALUES (?, ?, ?)").run(username, password, role_id);
      
      // Log action
      db.prepare("INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)").run(
        1, 
        "Criação de Usuário", 
        `Usuário criado: ${username}`
      );

      res.status(201).json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Usuário já existe" });
    }
  });

  app.get("/api/logs", (req, res) => {
    const logs = db.prepare(`
      SELECT l.*, u.username 
      FROM logs l 
      JOIN users u ON l.user_id = u.id 
      ORDER BY l.created_at DESC 
      LIMIT 100
    `).all();
    res.json(logs);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
