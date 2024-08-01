const express = require('express');
const axios = require('axios');
const qs = require('qs');
require('dotenv').config();

const app = express();
const port = 3000;

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;
const session = require('express-session');

app.use(express.static('public'));

app.use(session({
  secret: process.env.CLIENT_SECRET,
  resave: false,
  saveUninitialized: true,
}));

app.get('/auth/linkedin', (req, res) => {
  const authorizationUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=123456&scope=openid%20email%20w_member_social%20profile`;
  res.redirect(authorizationUrl);
});

app.get('/auth/linkedin/callback', async (req, res) => {
  const code = req.query.code;
  
  try {
    const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', qs.stringify({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const accessToken = tokenResponse.data.access_token;
    req.session.accessToken = accessToken;

    const profileResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log('Authenticated User:');
    console.log(profileResponse.data);

    res.redirect('/');
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get('/check-auth', (req, res) => {
  if (req.session.accessToken) {
    res.json(true);
  } else {
    res.json(false);
  }
});

// search API is not working 
// LinkedIn's public API does not provide broad search functionality for people or profiles due to privacy and access limitations.

app.get('/search', async (req, res) => {
  const query = req.query.query;
  const accessToken = req.session.accessToken;

  if (!accessToken) {
    return res.status(401).send('Unauthorized');
  }

  try {
    const searchResponse = await axios.get(`https://api.linkedin.com/v2/people?q=keywords&keywords=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    res.json(searchResponse.data.elements);
  } catch (error) {
    console.error('Error during search', error);
    res.status(500).send('Error during search');
  }
});


app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
