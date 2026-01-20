import { getDB } from '../config/db-config.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export async function createScheduledPost(postData) {
  const { type, db } = await getDB();
  
  if (type === 'mysql') {
    const id = postData.id || uuidv4();
    const sql = `
      INSERT INTO scheduled_posts (id, content, schedule_time, status, platform, config, article_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await query(sql, [
      id,
      postData.content,
      postData.schedule_time || postData.scheduleTime,
      postData.status || 'pending',
      postData.platform || 'linkedin',
      postData.config ? JSON.stringify(postData.config) : null,
      postData.article_id || postData.articleId || null
    ]);
    return { id, ...postData };
  } else {
    const post = {
      id: postData.id || uuidv4(),
      ...postData,
      createdAt: new Date().toISOString()
    };
    db.scheduledPosts = db.scheduledPosts || [];
    db.scheduledPosts.push(post);
    const { saveDB } = await import('../config/db-config.js');
    await saveDB();
    return post;
  }
}

export async function getScheduledPostById(id) {
  const { type, db } = await getDB();
  
  if (type === 'mysql') {
    const sql = 'SELECT * FROM scheduled_posts WHERE id = ?';
    const results = await query(sql, [id]);
    if (results[0] && results[0].config) {
      results[0].config = JSON.parse(results[0].config);
    }
    return results[0] || null;
  } else {
    return db.scheduledPosts?.find(p => p.id === id) || null;
  }
}

export async function getAllScheduledPosts(limit = 100) {
  const { type, db } = await getDB();
  
  if (type === 'mysql') {
    const sql = 'SELECT * FROM scheduled_posts ORDER BY schedule_time ASC LIMIT ?';
    const results = await query(sql, [limit]);
    return results.map(r => {
      if (r.config) r.config = JSON.parse(r.config);
      return r;
    });
  } else {
    return db.scheduledPosts?.slice(0, limit) || [];
  }
}

export async function getUpcomingPosts(limit = 10) {
  const { type, db } = await getDB();
  const now = new Date();
  
  if (type === 'mysql') {
    const sql = `
      SELECT * FROM scheduled_posts 
      WHERE schedule_time > ? AND status = 'pending'
      ORDER BY schedule_time ASC LIMIT ?
    `;
    const results = await query(sql, [now, limit]);
    return results.map(r => {
      if (r.config) r.config = JSON.parse(r.config);
      return r;
    });
  } else {
    return db.scheduledPosts
      ?.filter(p => new Date(p.scheduleTime) > now && p.status === 'pending')
      .sort((a, b) => new Date(a.scheduleTime) - new Date(b.scheduleTime))
      .slice(0, limit) || [];
  }
}

export async function updateScheduledPost(id, updates) {
  const { type, db } = await getDB();
  
  if (type === 'mysql') {
    const fields = [];
    const values = [];
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'config') {
        fields.push('config = ?');
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    const sql = `UPDATE scheduled_posts SET ${fields.join(', ')} WHERE id = ?`;
    await query(sql, [...values, id]);
    return await getScheduledPostById(id);
  } else {
    const post = db.scheduledPosts?.find(p => p.id === id);
    if (post) {
      Object.assign(post, updates);
      const { saveDB } = await import('../config/db-config.js');
      await saveDB();
    }
    return post;
  }
}

export async function deleteScheduledPost(id) {
  const { type, db } = await getDB();
  
  if (type === 'mysql') {
    const sql = 'DELETE FROM scheduled_posts WHERE id = ?';
    await query(sql, [id]);
    return true;
  } else {
    const index = db.scheduledPosts?.findIndex(p => p.id === id);
    if (index !== -1) {
      db.scheduledPosts.splice(index, 1);
      const { saveDB } = await import('../config/db-config.js');
      await saveDB();
      return true;
    }
    return false;
  }
}

export default {
  createScheduledPost,
  getScheduledPostById,
  getAllScheduledPosts,
  getUpcomingPosts,
  updateScheduledPost,
  deleteScheduledPost
};
