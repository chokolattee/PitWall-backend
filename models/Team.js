const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
}, { timestamps: true });

const Team = mongoose.model('Team', teamSchema);

// Default seed values
const DEFAULT_TEAMS = [
  'BWT Alpine',
  'Oracle Red Bull Racing',
  'Scuderia Ferrari',
  'Mercedes-AMG Petronas',
  'McLaren F1 Team',
  'Aston Martin Aramco Cognizant Formula One Team',
  'Williams Racing',
  'Visa Cash App Racing Bulls F1 Team',
  'Stake F1 Team Kick Sauber',
  'MoneyGram Haas F1 Team',
];

module.exports = { Team, DEFAULT_TEAMS };
