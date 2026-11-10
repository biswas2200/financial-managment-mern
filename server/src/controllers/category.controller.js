import * as categoryService from '../services/category.service.js';

export async function list(req, res) {
  res.json(await categoryService.listCategories(req.user._id, req.valid.query));
}

export async function create(req, res) {
  res.status(201).json(await categoryService.createCategory(req.user._id, req.valid.body));
}

export async function update(req, res) {
  res.json(await categoryService.updateCategory(req.user._id, req.valid.params.id, req.valid.body));
}

export async function remove(req, res) {
  await categoryService.deleteCategory(req.user._id, req.valid.params.id);
  res.status(204).end();
}
