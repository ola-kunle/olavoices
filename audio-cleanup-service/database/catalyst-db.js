/**
 * Catalyst DataStore Wrapper
 *
 * This module provides a database interface for Catalyst DataStore,
 * compatible with the existing SQLite-based code structure.
 *
 * Usage:
 * 1. Create tables in Catalyst Console (see CATALYST_DATASTORE_SETUP.md)
 * 2. Update TABLE_IDS below with your actual table IDs from Catalyst Console
 * 3. Replace 'import db from './schema.js'' with 'import db from './catalyst-db.js''
 */

import catalyst from 'zcatalyst-sdk-node';

// ============================================
// CONFIGURATION
// ============================================

/**
 * TODO: Update these Table IDs after creating tables in Catalyst Console
 *
 * To find your Table IDs:
 * 1. Go to Catalyst Console → Data Store → Tables
 * 2. Click on each table
 * 3. Copy the Table ID from the URL or table details
 */
const TABLE_IDS = {
  orders: process.env.DATASTORE_ORDERS_TABLE_ID || '5522000000016318',
  files: process.env.DATASTORE_FILES_TABLE_ID || '5522000000017944',
  download_tokens: process.env.DATASTORE_TOKENS_TABLE_ID || '5522000000017187',
  notifications: process.env.DATASTORE_NOTIFICATIONS_TABLE_ID || '5522000000019706'
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get Catalyst DataStore instance from request
 * @param {Object} req - Express request object
 * @returns {Object} Catalyst DataStore instance
 */
function getDataStore(req) {
  if (!req) {
    throw new Error('Request object is required to initialize Catalyst');
  }
  const app = catalyst.initialize(req);
  return app.datastore();
}

/**
 * Get table instance
 * @param {Object} req - Express request object
 * @param {string} tableName - Name of the table
 * @returns {Object} Table instance
 */
function getTable(req, tableName) {
  const datastore = getDataStore(req);
  const tableId = TABLE_IDS[tableName];

  if (!tableId || tableId === '0') {
    throw new Error(`Table ID not configured for: ${tableName}. Update TABLE_IDS in catalyst-db.js`);
  }

  return datastore.table(tableId);
}

// ============================================
// DATABASE OPERATIONS
// ============================================

/**
 * SQLite-compatible prepare() interface for Catalyst DataStore
 *
 * This provides a similar API to better-sqlite3 for easier migration:
 * db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)
 */
const db = {
  /**
   * Prepare a statement (mimics SQLite prepare)
   * @param {string} sql - SQL query
   * @returns {Object} Statement object with get(), all(), run() methods
   */
  prepare: (sql) => {
    console.warn('Warning: Using prepare() with Catalyst DataStore requires Express req object');

    return {
      /**
       * Execute query and return single row
       * @param {Object} req - Express request object (required for Catalyst)
       * @param {...any} params - Query parameters
       * @returns {Promise<Object>} Single row result
       */
      get: async (req, ...params) => {
        try {
          const { table, where, operation } = parseSQL(sql);

          if (operation === 'SELECT') {
            const rows = await executeSelect(req, table, where, params);
            return rows[0] || null;
          }

          throw new Error(`Unsupported operation for get(): ${operation}`);
        } catch (error) {
          console.error('DataStore get() error:', error);
          throw error;
        }
      },

      /**
       * Execute query and return all rows
       * @param {Object} req - Express request object (required for Catalyst)
       * @param {...any} params - Query parameters
       * @returns {Promise<Array>} Array of rows
       */
      all: async (req, ...params) => {
        try {
          const { table, where, operation, orderBy } = parseSQL(sql);

          if (operation === 'SELECT') {
            return await executeSelect(req, table, where, params, orderBy);
          }

          throw new Error(`Unsupported operation for all(): ${operation}`);
        } catch (error) {
          console.error('DataStore all() error:', error);
          throw error;
        }
      },

      /**
       * Execute INSERT, UPDATE, DELETE
       * @param {Object} req - Express request object (required for Catalyst)
       * @param {...any} params - Query parameters
       * @returns {Promise<Object>} Result with changes count
       */
      run: async (req, ...params) => {
        try {
          const { table, operation, columns, values, where } = parseSQL(sql);
          const tableInstance = getTable(req, table);

          if (operation === 'INSERT') {
            const row = buildInsertData(columns, params);
            const result = await tableInstance.insertRow(row);
            return { changes: 1, lastInsertRowid: result.ROWID };
          }

          if (operation === 'UPDATE') {
            const updates = buildUpdateData(columns, params);
            const whereClause = buildWhere(where, params.slice(columns.length));
            const result = await tableInstance.updateRow(whereClause, updates);
            return { changes: result.affected_rows || 0 };
          }

          if (operation === 'DELETE') {
            const whereClause = buildWhere(where, params);
            const result = await tableInstance.deleteRow(whereClause);
            return { changes: result.affected_rows || 0 };
          }

          throw new Error(`Unsupported operation: ${operation}`);
        } catch (error) {
          console.error('DataStore run() error:', error);
          throw error;
        }
      }
    };
  },

  /**
   * Execute immediate SQL (mainly for table creation, not needed in Catalyst)
   * @param {string} sql - SQL to execute
   */
  exec: (sql) => {
    console.log('exec() called - table creation should be done in Catalyst Console');
    // Table creation is handled via Catalyst Console UI
    // This is here for compatibility but does nothing
  },

  /**
   * Set pragma (not applicable to Catalyst DataStore)
   * @param {string} pragma - Pragma statement
   */
  pragma: (pragma) => {
    console.log(`pragma() called: ${pragma} - not applicable to Catalyst DataStore`);
    // Catalyst DataStore doesn't use pragmas
  }
};

// ============================================
// SQL PARSING (Basic)
// ============================================

/**
 * Parse SQL statement (basic parser for common queries)
 * @param {string} sql - SQL statement
 * @returns {Object} Parsed components
 */
function parseSQL(sql) {
  const sqlUpper = sql.toUpperCase().trim();

  let operation = null;
  if (sqlUpper.startsWith('SELECT')) operation = 'SELECT';
  else if (sqlUpper.startsWith('INSERT')) operation = 'INSERT';
  else if (sqlUpper.startsWith('UPDATE')) operation = 'UPDATE';
  else if (sqlUpper.startsWith('DELETE')) operation = 'DELETE';

  // Extract table name
  const tableMatch = sql.match(/(?:FROM|INTO|UPDATE)\s+(\w+)/i);
  const table = tableMatch ? tableMatch[1] : null;

  // Extract WHERE clause
  const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER BY|LIMIT|$)/i);
  const where = whereMatch ? whereMatch[1].trim() : null;

  // Extract ORDER BY
  const orderMatch = sql.match(/ORDER BY\s+(.+?)(?:LIMIT|$)/i);
  const orderBy = orderMatch ? orderMatch[1].trim() : null;

  // Extract columns for INSERT
  const insertColsMatch = sql.match(/INSERT INTO\s+\w+\s*\(([^)]+)\)/i);
  const columns = insertColsMatch ? insertColsMatch[1].split(',').map(c => c.trim()) : [];

  // Extract SET clause for UPDATE
  const setMatch = sql.match(/SET\s+(.+?)(?:WHERE|$)/i);
  const setClause = setMatch ? setMatch[1].trim() : null;
  if (setClause) {
    const setCols = setClause.split(',').map(s => s.split('=')[0].trim());
    columns.push(...setCols);
  }

  return { operation, table, where, orderBy, columns };
}

/**
 * Execute SELECT query using ZCQL
 * @param {Object} req - Express request
 * @param {string} tableName - Table name
 * @param {string} where - WHERE clause
 * @param {Array} params - Query parameters
 * @param {string} orderBy - ORDER BY clause
 * @returns {Promise<Array>} Rows
 */
async function executeSelect(req, tableName, where, params, orderBy) {
  const app = catalyst.initialize(req);
  const zcql = app.zcql();

  // Build ZCQL query
  let query = `SELECT * FROM ${tableName}`;

  if (where) {
    // Replace ? placeholders with actual values
    let whereClause = where;
    params.forEach((param) => {
      const value = typeof param === 'string' ? `'${param}'` : param;
      whereClause = whereClause.replace('?', value);
    });
    query += ` WHERE ${whereClause}`;
  }

  if (orderBy) {
    query += ` ORDER BY ${orderBy}`;
  }

  // Execute ZCQL query
  const result = await zcql.executeZCQLQuery(query);

  // Extract rows from result (ZCQL returns array with table name as key)
  if (result && result.length > 0 && result[0][tableName]) {
    return Array.isArray(result[0][tableName]) ? result[0][tableName] : [result[0][tableName]];
  }

  return [];
}

/**
 * Build WHERE clause for Catalyst DataStore
 * @param {string} where - WHERE clause from SQL
 * @param {Array} params - Parameters
 * @returns {Object} Catalyst WHERE clause object
 */
function buildWhere(where, params) {
  // Simple parser for basic WHERE conditions
  // Format: column = ? OR column LIKE ? OR column > ? etc.

  const conditions = {};
  let paramIndex = 0;

  // Split by AND (for now, doesn't handle OR)
  const parts = where.split(/\s+AND\s+/i);

  parts.forEach(part => {
    const eqMatch = part.match(/(\w+)\s*=\s*\?/);
    const likeMatch = part.match(/(\w+)\s+LIKE\s+\?/);
    const gtMatch = part.match(/(\w+)\s*>\s*\?/);
    const ltMatch = part.match(/(\w+)\s*<\s*\?/);

    if (eqMatch) {
      conditions[eqMatch[1]] = params[paramIndex++];
    } else if (likeMatch) {
      // Catalyst uses 'contains' for LIKE '%value%'
      const value = params[paramIndex++];
      conditions[likeMatch[1]] = value.replace(/%/g, '');
    } else if (gtMatch) {
      conditions[gtMatch[1]] = { $gt: params[paramIndex++] };
    } else if (ltMatch) {
      conditions[ltMatch[1]] = { $lt: params[paramIndex++] };
    }
  });

  return conditions;
}

/**
 * Build INSERT data object
 * @param {Array} columns - Column names
 * @param {Array} params - Values
 * @returns {Object} Row data
 */
function buildInsertData(columns, params) {
  const row = {};
  columns.forEach((col, i) => {
    row[col] = params[i];
  });
  return row;
}

/**
 * Build UPDATE data object
 * @param {Array} columns - Column names to update
 * @param {Array} params - New values
 * @returns {Object} Update data
 */
function buildUpdateData(columns, params) {
  const updates = {};
  columns.forEach((col, i) => {
    updates[col] = params[i];
  });
  return updates;
}

// ============================================
// DIRECT DATASTORE FUNCTIONS
// (Preferred for new code - more efficient)
// ============================================

/**
 * Insert a new order
 * @param {Object} req - Express request
 * @param {Object} orderData - Order data
 * @returns {Promise<Object>} Inserted row
 */
export async function insertOrder(req, orderData) {
  const table = getTable(req, 'orders');
  return await table.insertRow(orderData);
}

/**
 * Get order by ID
 * @param {Object} req - Express request
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Order row
 */
export async function getOrder(req, orderId) {
  const app = catalyst.initialize(req);
  const zcql = app.zcql();
  const result = await zcql.executeZCQLQuery(`SELECT * FROM orders WHERE id = '${orderId}'`);

  if (result && result.length > 0 && result[0].orders) {
    return Array.isArray(result[0].orders) ? result[0].orders[0] : result[0].orders;
  }
  return null;
}

/**
 * Get all orders
 * @param {Object} req - Express request
 * @returns {Promise<Array>} All orders
 */
export async function getAllOrders(req) {
  const table = getTable(req, 'orders');
  const allOrders = [];
  let hasMoreRecords = true;
  let nextToken = null;

  // Fetch all pages of orders
  while (hasMoreRecords) {
    const response = await table.getPagedRows({ nextToken, maxRows: 100 });

    if (response.data && response.data.length > 0) {
      allOrders.push(...response.data);
    }

    hasMoreRecords = response.more_records;
    nextToken = response.next_token;
  }

  // Sort by CREATEDTIME descending (most recent first)
  allOrders.sort((a, b) => new Date(b.CREATEDTIME) - new Date(a.CREATEDTIME));

  return allOrders;
}

/**
 * Update order
 * @param {Object} req - Express request
 * @param {string} orderId - Order ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Update result
 */
export async function updateOrder(req, orderId, updates) {
  const table = getTable(req, 'orders');
  return await table.updateRow({ id: orderId }, updates);
}

/**
 * Insert file record
 * @param {Object} req - Express request
 * @param {Object} fileData - File data
 * @returns {Promise<Object>} Inserted file
 */
export async function insertFile(req, fileData) {
  const table = getTable(req, 'files');
  return await table.insertRow(fileData);
}

/**
 * Get files for an order
 * @param {Object} req - Express request
 * @param {string} orderId - Order ID
 * @returns {Promise<Array>} Files for the order
 */
export async function getOrderFiles(req, orderId) {
  const app = catalyst.initialize(req);
  const zcql = app.zcql();
  const result = await zcql.executeZCQLQuery(`SELECT * FROM files WHERE order_id = '${orderId}'`);

  if (result && result.length > 0 && result[0].files) {
    return Array.isArray(result[0].files) ? result[0].files : [result[0].files];
  }
  return [];
}

/**
 * Create download token
 * @param {Object} req - Express request
 * @param {Object} tokenData - Token data
 * @returns {Promise<Object>} Created token
 */
export async function createDownloadToken(req, tokenData) {
  const table = getTable(req, 'download_tokens');
  return await table.insertRow(tokenData);
}

/**
 * Get token by token string
 * @param {Object} req - Express request
 * @param {string} token - Token string
 * @returns {Promise<Object>} Token record
 */
export async function getToken(req, token) {
  const app = catalyst.initialize(req);
  const zcql = app.zcql();
  const result = await zcql.executeZCQLQuery(`SELECT * FROM download_tokens WHERE token = '${token}'`);

  if (result && result.length > 0 && result[0].download_tokens) {
    return Array.isArray(result[0].download_tokens) ? result[0].download_tokens[0] : result[0].download_tokens;
  }
  return null;
}

/**
 * Increment download count
 * @param {Object} req - Express request
 * @param {string} token - Token string
 * @returns {Promise<Object>} Update result
 */
export async function incrementDownloadCount(req, token) {
  const tokenRecord = await getToken(req, token);
  if (!tokenRecord) return null;

  const table = getTable(req, 'download_tokens');
  return await table.updateRow(
    { token },
    { download_count: tokenRecord.download_count + 1 }
  );
}

/**
 * Log notification
 * @param {Object} req - Express request
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} Created notification log
 */
export async function logNotification(req, notificationData) {
  const table = getTable(req, 'notifications');
  return await table.insertRow(notificationData);
}

// ============================================
// INITIALIZATION
// ============================================

console.log('✅ Catalyst DataStore wrapper initialized');
console.log('⚠️  Remember to configure TABLE_IDS in catalyst-db.js');

// Export default db object for SQLite compatibility
export default db;

// Also export direct functions
export {
  getDataStore,
  getTable,
  TABLE_IDS
};
