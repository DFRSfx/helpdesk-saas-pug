const Department = require('../models/Department');

// List all departments
exports.index = async (req, res, next) => {
  try {
    const departments = await Department.getAll();

    res.render('departments/index', {
      title: 'Departments',
      departments
    });
  } catch (error) {
    next(error);
  }
};

// Show create department form (admin only)
exports.showCreate = (req, res) => {
  res.render('departments/create', {
    title: 'Create Department'
  });
};

// Handle create department (admin only)
exports.create = async (req, res, next) => {
  try {
    const { name } = req.body;
    await Department.create(name);

    req.flash('success', 'Department created successfully');
    res.redirect('/departments');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      req.flash('error', 'Department name already exists');
      return res.redirect('/departments/create');
    }
    next(error);
  }
};

// Show edit department form (admin only)
exports.showEdit = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      req.flash('error', 'Department not found');
      return res.redirect('/departments');
    }

    res.render('departments/edit', {
      title: 'Edit Department',
      department
    });
  } catch (error) {
    next(error);
  }
};

// Handle update department (admin only)
exports.update = async (req, res, next) => {
  try {
    const { name } = req.body;
    await Department.update(req.params.id, name);

    req.flash('success', 'Department updated successfully');
    res.redirect('/departments');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      req.flash('error', 'Department name already exists');
      return res.redirect(`/departments/${req.params.id}/edit`);
    }
    next(error);
  }
};

// Delete department (admin only)
exports.delete = async (req, res, next) => {
  try {
    await Department.delete(req.params.id);

    req.flash('success', 'Department deleted successfully');
    res.redirect('/departments');
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      req.flash('error', 'Cannot delete department with existing tickets');
      return res.redirect('/departments');
    }
    next(error);
  }
};

// Show department stats
exports.stats = async (req, res, next) => {
  try {
    const stats = await Department.getStats();

    res.render('departments/stats', {
      title: 'Department Statistics',
      stats
    });
  } catch (error) {
    next(error);
  }
};
