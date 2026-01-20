import { getDB } from '../config/db-config.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export async function createTemplate(templateData) {
  const { type, db } = await getDB();
  
  if (type === 'mysql') {
    const id = templateData.id || uuidv4();
    const sql = `
      INSERT INTO templates (id, name, content, category, variables, usage_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await query(sql, [
      id,
      templateData.name,
      templateData.content,
      templateData.category || null,
      templateData.variables ? JSON.stringify(templateData.variables) : null,
      templateData.usage_count || 0
    ]);
    return { id, ...templateData };
  } else {
    const template = {
      id: templateData.id || uuidv4(),
      ...templateData,
      usageCount: templateData.usageCount || 0,
      createdAt: new Date().toISOString()
    };
    db.templates = db.templates || [];
    db.templates.push(template);
    const { saveDB } = await import('../config/db-config.js');
    await saveDB();
    return template;
  }
}

export async function getTemplateById(id) {
  const { type, db } = await getDB();
  
  if (type === 'mysql') {
    const sql = 'SELECT * FROM templates WHERE id = ?';
    const results = await query(sql, [id]);
    if (results[0] && results[0].variables) {
      results[0].variables = JSON.parse(results[0].variables);
    }
    return results[0] || null;
  } else {
    return db.templates?.find(t => t.id === id) || null;
  }
}

export async function getAllTemplates() {
  const { type, db } = await getDB();
  
  if (type === 'mysql') {
    const sql = 'SELECT * FROM templates ORDER BY usage_count DESC';
    const results = await query(sql);
    return results.map(r => {
      if (r.variables) r.variables = JSON.parse(r.variables);
      return r;
    });
  } else {
    return db.templates || [];
  }
}

export async function incrementTemplateUsage(id) {
  const { type, db } = await getDB();
  
  if (type === 'mysql') {
    const sql = 'UPDATE templates SET usage_count = usage_count + 1 WHERE id = ?';
    await query(sql, [id]);
    return await getTemplateById(id);
  } else {
    const template = db.templates?.find(t => t.id === id);
    if (template) {
      template.usageCount = (template.usageCount || 0) + 1;
      const { saveDB } = await import('../config/db-config.js');
      await saveDB();
    }
    return template;
  }
}

export async function updateTemplate(id, updates) {
  const { type, db } = await getDB();
  
  if (type === 'mysql') {
    const fields = [];
    const values = [];
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'variables') {
        fields.push('variables = ?');
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    const sql = `UPDATE templates SET ${fields.join(', ')} WHERE id = ?`;
    await query(sql, [...values, id]);
    return await getTemplateById(id);
  } else {
    const template = db.templates?.find(t => t.id === id);
    if (template) {
      Object.assign(template, updates);
      const { saveDB } = await import('../config/db-config.js');
      await saveDB();
    }
    return template;
  }
}

export async function deleteTemplate(id) {
  const { type, db } = await getDB();
  
  if (type === 'mysql') {
    const sql = 'DELETE FROM templates WHERE id = ?';
    await query(sql, [id]);
    return true;
  } else {
    const index = db.templates?.findIndex(t => t.id === id);
    if (index !== -1) {
      db.templates.splice(index, 1);
      const { saveDB } = await import('../config/db-config.js');
      await saveDB();
      return true;
    }
    return false;
  }
}

export default {
  createTemplate,
  getTemplateById,
  getAllTemplates,
  incrementTemplateUsage,
  updateTemplate,
  deleteTemplate
};
