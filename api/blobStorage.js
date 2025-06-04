const { put, del } = require('@vercel/blob');

async function uploadToBlob(buffer, filename) {
  try {
    const blob = await put(filename, buffer, {
      access: 'public',
      addRandomSuffix: true,
    });
    return blob;
  } catch (error) {
    console.error('Blob upload error:', error);
    throw error;
  }
}

async function deleteFromBlob(url) {
  try {
    await del(url);
  } catch (error) {
    console.error('Blob delete error:', error);
  }
}

module.exports = { uploadToBlob, deleteFromBlob };
