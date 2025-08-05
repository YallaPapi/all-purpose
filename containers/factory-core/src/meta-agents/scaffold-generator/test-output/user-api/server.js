const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to User API',
    description: 'A RESTful API service built with Express for user management'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 User API server running on port ${PORT}`);
});