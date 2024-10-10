const axios = require('axios');

const API_KEY = '***REMOVED***';
const TOKEN = '***REMOVED***';

async function testTrelloCredentials() {
  try {
    const response = await axios.get(`https://api.trello.com/1/members/me/boards?key=${API_KEY}&token=${TOKEN}`);
    console.log('Trello credentials are valid. Your boards:', response.data.map(board => board.name));
  } catch (error) {
    console.error('Error testing Trello credentials:', error.response ? error.response.data : error.message);
  }
}

testTrelloCredentials();