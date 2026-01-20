import { getDB } from '../config/db-config.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export async function createArticle(articleData) {
  const { type, db } = await getDB();
  
  if (type === 'mysql') {
    const id = articleData.id || uuidv4();
    const sql = `
      INSERT INTO articles (id, title, content, summary, url, source, category, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await query(sql, [
      id,
      articleData.title,
      articleData.content,
      articleData.summary || null,
      articleData.url || null,
      articleData.source || null,
      articleData.category || null,
      articleData.published_at || null
    ]);
    return { id, ...articleData };
  } else {
    const article = {
      id: articleData.id || uuidv4(),
      ...articleData,
      createdAt: new Date().toISOString()
    };
    db.articles = db.articles || [];
    db.articles.push(article);
    const { saveDB } = await import('../config/db-config.js');
    await saveDB();
    return article;
  }
}

export async function getArticleById(id) {
  const { type, db } = await getDB();
  
  if (type === 'mysql') {
    const sql = 'SELECT * FROM articles WHERE id = ?';
    const results = await query(sql, [id]);
    return results[0] || null;
  } else {
    return db.articles?.find(a => a.id === id) || null;
  }
}

export async function getAllArticles(limit = 100) {
  const { type, db } = await getDB();
  
  if (type === 'mysql') {
    const sql = 'SELECT * FROM articles ORDER BY published_at DESC LIMIT ?';
    return await query(sql, [limit]);
  } else {
    return db.articles?.slice(-limit).reverse() || [];
  }
}

export async function getArticlesByCategory(category, limit = 50) {
  const { type, db } = await getDB();
  
  if (type === 'mysql') {
    const sql = 'SELECT * FROM articles WHERE category = ? ORDER BY published_at DESC LIMIT ?';
    return await query(sql, [category, limit]);
  } else {
    return db.articles?.filter(a => a.category === category).slice(-limit).reverse() || [];
  }
}

export async function updateArticle(id, updates) {
  const { type, db } = await getDB();
  
  if (type === 'mysql') {
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    const sql = `UPDATE articles SET ${fields} WHERE id = ?`;
    await query(sql, [...values, id]);
    return await getArticleById(id);
  } else {
    const article = db.articles?.find(a => a.id === id);
    if (article) {
      Object.assign(article, updates);
      const { saveDB } = await import('../config/db-config.js');
      await saveDB();
    }
    return article;
  }
}

export async function deleteArticle(id) {
  const { type, db } = await getDB();
  
  if (type === 'mysql') {
    const sql = 'DELETE FROM articles WHERE id = ?';
    await query(sql, [id]);
    return true;
  } else {
    const index = db.articles?.findIndex(a => a.id === id);
    if (index !== -1) {
      db.articles.splice(index, 1);
      const { saveDB } = await import('../config/db-config.js');
      await saveDB();
      return true;
    }
    return false;
  }
}

export default {
  createArticle,
  getArticleById,
  getAllArticles,
  getArticlesByCategory,
  updateArticle,
  deleteArticle
};
