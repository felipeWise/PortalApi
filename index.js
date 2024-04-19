import express from "express";
import session from "express-session";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import ejs from "ejs";
import bodyParser from "body-parser";
import crypto from "crypto"
import pkg from 'pg';
import { parseArgs } from "util";
import dotenv from 'dotenv';
dotenv.config();
const {Pool} = pkg;

// Acesse as variáveis de ambiente usando process.env
const dbConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
};

// Use as variáveis de configuração do banco de dados conforme necessário
const pool = new Pool(dbConfig);

// Obter o caminho do diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const port = 3000;
const app = express();

const secret = crypto.randomBytes(64).toString('hex');
app.use(session({ 
    secret,
    resave: false,
    saveUninitialized: false
}));
app.use(bodyParser.urlencoded({ extended: true }));

app.engine("html", ejs.renderFile);
app.set("view engine", "html");
app.set("views", join(__dirname, "/views"));
app.use(express.static(join(__dirname, "public")));

// Rota de Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
        if (result.rows.length > 0) {
            const nameResult = await pool.query('SELECT name FROM users WHERE email = $1', [email]);
            const name = nameResult.rows[0].name;
                        
            if (password === "123mudar"){
                res.redirect(`/mudarSenha?email=${encodeURIComponent(email)}`);
            } else{
                req.session.login = true;
                res.render("logado", {name});
            }

        } else {
            res.render("index", { error: 'Credenciais incorretas' });
        }
    } catch (error) {
        console.error('Erro ao verificar login:', error);
        res.status(500).json({ error: 'Erro ao verificar login' });
    }
});

// Rota para exibir o formulário de alteração de senha
app.get("/mudarSenha", (req, res) => {
    // Recuperar o email da URL
    const email = req.query.email;
    res.render("mudarSenha", { email }); // Passar o email para o template
});


// Rota para processar a alteração de senha
app.post("/mudarSenha", async (req, res) => {
    const { newPassword, email } = req.body;
    // Lógica para alterar a senha no banco de dados
    await pool.query('UPDATE users SET password = $1 WHERE email = $2', [newPassword, email]);
    // Após alterar a senha, redirecione o usuário de volta para a página de login
    res.render("index");
});

app.get("/", (req, res) => {
    if (req.session.login) {
        res.render("logado"); // Renderiza a página "logado" se houver uma sessão
    } else {
        res.render("index"); // Renderiza a página "index" se não houver uma sessão
    }
});

app.get("/login", (req, res) => {
    if (req.session.login) {
        res.render("logado"); // Renderiza a página "logado" se houver uma sessão
    } else {
        res.render("index"); // Renderiza a página "index" se não houver uma sessão
    }
});

// Servidor no ar na porta PORT
app.listen(port, () => {
    console.log("Servidor Rodando"); 
});
