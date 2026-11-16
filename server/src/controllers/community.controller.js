import * as community from '../services/community.service.js';

export async function listPosts(req, res) {
  res.json(await community.listPosts(req.user._id, req.valid.query));
}
export async function createPost(req, res) {
  res.status(201).json(await community.createPost(req.user._id, req.valid.body));
}
export async function getPost(req, res) {
  res.json(await community.getPost(req.user._id, req.valid.params.id));
}
export async function deletePost(req, res) {
  await community.deletePost(req.user._id, req.valid.params.id);
  res.status(204).end();
}
export async function listComments(req, res) {
  res.json(await community.listComments(req.user._id, req.valid.query));
}
export async function addComment(req, res) {
  res.status(201).json(await community.addComment(req.user._id, req.valid.body));
}
export async function deleteComment(req, res) {
  await community.deleteComment(req.user._id, req.valid.params.id);
  res.status(204).end();
}
export async function react(req, res) {
  res.json(await community.setReaction(req.user._id, req.valid.body));
}
