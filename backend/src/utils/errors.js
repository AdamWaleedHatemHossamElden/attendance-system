export function sendInternalError(res, context) {
  console.error(context);
  return res.status(500).json({ error: 'Internal server error' });
}

export function isDuplicateEntry(error) {
  return error?.code === 'ER_DUP_ENTRY' || error?.errno === 1062;
}
