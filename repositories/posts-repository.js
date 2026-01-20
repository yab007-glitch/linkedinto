import { getDB } from '../config/db-config.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export async function createPost(postData) {
  const { type, db, pool } = await getDB();
  
  if (type === 'mysql') {
    const id = postData.id || uuidv4();
    const sql = `
      INSERT INTO posts (id, content, tone, format, platform, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await query(sql, [
      id,
      postData.content,
      postData.tone || null,
      postData.format || null,
      postData.platform || 'linkedin',
      postData.status || 'draft'
    ]);
    return { id, ...postData };
  } else {
    const post = {
      id: postData.id || uuidv4(),
      ...postData,
      createdAt: new Date().toISOString()
    };
    db.posts = db.posts || [];
    db.posts.push(post);
    const { saveDB } = await import('../config/db-config.js');
    await saveDB();
    return post;
  }
}

export async function getPostById(id) {
  const { type, db } = await getDB();
  
  if (type === 'mysql') {
    const sql = 'SELECT * FROM posts WHERE id = ?';
    const results = await query(sql, [id]);
    return results[0] || null;
  } else {
    return db.posts?.find(p => p.id === id) || null;
  }
}

export async function getAllPosts(limit = 100) {
  const { type, db } = await getDB();
  
  if (type === 'mysql') {
    const sql = 'SELECT * FROM posts ORDER BY created_at DESC LIMIT ?';
    return await query(sql, [limit]);
  } else {
    return db.posts?.slice(-limit).reverse() || [];
  }
}

export async function updatePost(id, updates) {
  const { type, db } = await getDB();
  
  if (type === 'mysql') {
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    const sql = `UPDATE posts SET ${fields} WHERE id = ?`;
    await query(sql, [...values, id]);
    return await getPostById(id);
  } else {
    const post = db.posts?.find(p => p.id === id);
    if (post) {
      Object.assign(post, updates);
      const { saveDB } = await import('../config/db-config.js');
      await saveDB();
    }
    return post;
  }
}

export async function deletePost(id) {
  const { type, db } = await getDB();
  
  if (type === 'mysql') {
    const sql = 'DELETE FROM posts WHERE id = ?';
    await query(sql, [id]);
    return true;
  } else {
    const index = db.posts?.findIndex(p => p.id === id);
    if (index !== -1) {
      db.posts.splice(index, 1);
      const { saveDB } = await import('../config/db-config.js');
      await saveDB();
      return true;
    }
    return false;
  }
}

export default {
  createPost,
  getPostById,
  getAllPosts,
  updatePost,
  deletePost
};
