const { Team, DEFAULT_TEAMS } = require('../models/Team');

// GET /api/teams
exports.getAll = async (req, res) => {
  try {
    const teams = await Team.find({}).sort({ name: 1 });
    res.status(200).json({ message: 'Teams fetched successfully', teams });
  } catch (err) {
    console.error('getAll teams error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/teams
exports.create = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Team name is required' });
    }
    const existing = await Team.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (existing) {
      return res.status(409).json({ error: 'Team already exists' });
    }
    const team = await Team.create({ name: name.trim() });
    res.status(201).json({ message: 'Team created successfully', team });
  } catch (err) {
    console.error('create team error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE /api/teams/:id
exports.remove = async (req, res) => {
  try {
    const team = await Team.findByIdAndDelete(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    res.status(200).json({ message: 'Team deleted successfully' });
  } catch (err) {
    console.error('remove team error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Seed defaults (called once on server start if empty)
exports.seedDefaults = async () => {
  try {
    const count = await Team.countDocuments();
    if (count === 0) {
      await Team.insertMany(DEFAULT_TEAMS.map(name => ({ name })));
      console.log('Default teams seeded');
    }
  } catch (err) {
    console.error('Seed teams error:', err);
  }
};
