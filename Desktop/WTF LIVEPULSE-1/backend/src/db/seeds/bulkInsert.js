async function bulkInsertRows(client, table, columns, rows, batchSize = 1000) {
  if (!rows.length) {
    return;
  }

  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    const values = [];

    const placeholders = batch
      .map((row, rowIndex) => {
        const offset = rowIndex * columns.length;
        columns.forEach((column) => {
          values.push(row[column]);
        });

        return `(${columns.map((_, columnIndex) => `$${offset + columnIndex + 1}`).join(', ')})`;
      })
      .join(', ');

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`;
    await client.query(sql, values);
  }
}

module.exports = {
  bulkInsertRows,
};

