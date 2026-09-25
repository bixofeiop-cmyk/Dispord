const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
// Exemplo de lógica no server.js
socket.on('login', ({ username, password }) => {
  // Se o utilizador não existe nas suas contas guardadas:
  if (!users[username]) {
    // Cria a conta automaticamente com a palavra-passe fornecida
    users[username] = { password: password, role: 'user' };
    socket.emit('login_success', { username, role: 'user' });
    console.log(`Nova conta criada: ${username}`);
  } 
  // Se a conta já existe, verifica a palavra-passe:
  else if (users[username].password === password) {
    socket.emit('login_success', { username, role: users[username].role });
  } 
  // Palavra-passe incorreta:
  else {
    socket.emit('login_error', 'Senha incorreta!');
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Banco de Dados em Memória (substituível por MongoDB/PostgreSQL)
const users = {
  admin: { username: 'admin', passwordHash: 'ADMIN123', role: 'admin', banned: false }
};

const channels = ['geral', 'cyber-talk', 'memes-neon', 'voz-general'];
const messages = {
  'geral': [
    { id: 1, user: 'System', text: 'Bem-vindo ao CyberComm Grid! Mantenha a ordem digital.', time: '00:00', type: 'system' }
  ]
};

// Autenticação API
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users[username.toLowerCase()];

  if (!user) {
    return res.status(401).json({ error: 'Usuário não encontrado' });
  }

  if (user.banned) {
    return res.status(403).json({ error: 'Conta BANIU DA REDE' });
  }

  // Verificação simples (em produção usar bcrypt)
  if (user.passwordHash !== password) {
    return res.status(401).json({ error: 'Senha incorreta' });
  }

  res.json({ username: user.username, role: user.role });
});

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  const lowerName = username.toLowerCase();

  if (users[lowerName]) {
    return res.status(400).json({ error: 'Nome de usuário já existe' });
  }

  users[lowerName] = { username, passwordHash: password, role: 'user', banned: false };
  res.json({ success: true, username, role: 'user' });
});

// Websockets - Comunicação em Tempo Real
io.on('connection', (socket) => {
  socket.on('joinChannel', (channel) => {
    socket.join(channel);
    socket.emit('loadHistory', messages[channel] || []);
  });

  socket.on('sendMessage', ({ channel, user, text, role }) => {
    if (!messages[channel]) messages[channel] = [];
    
    const newMsg = {
      id: Date.now(),
      user,
      text,
      role,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    messages[channel].push(newMsg);
    io.to(channel).emit('newMessage', newMsg);
  });

  // Ações de Admin
  socket.on('adminAction', ({ type, targetUser, adminPassword }) => {
    if (adminPassword !== 'ADMIN123') return;

    if (type === 'ban' && users[targetUser.toLowerCase()]) {
      users[targetUser.toLowerCase()].banned = true;
      io.emit('userBanned', targetUser);
    }
  });
});

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
