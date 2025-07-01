const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

class GoogleDriveService {
  constructor() {
    this.auth = null;
    this.drive = null;
    this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  }

  async initialize() {
    try {
      // Use service account credentials
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      
      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file']
      });

      this.drive = google.drive({ version: 'v3', auth: this.auth });
      console.log('Google Drive service initialized');
    } catch (error) {
      console.error('Failed to initialize Google Drive service:', error);
      throw error;
    }
  }

  async uploadFile(fileBuffer, fileName, mimeType) {
    if (!this.drive) {
      await this.initialize();
    }

    try {
      const fileMetadata = {
        name: `${Date.now()}-${fileName}`,
        parents: this.folderId ? [this.folderId] : undefined
      };

      const media = {
        mimeType,
        body: require('stream').Readable.from(fileBuffer)
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id,name,webViewLink'
      });

      console.log('File uploaded to Google Drive:', response.data.name);
      return {
        id: response.data.id,
        name: response.data.name,
        link: response.data.webViewLink
      };
    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      throw error;
    }
  }

  async deleteFile(fileId) {
    if (!this.drive) {
      await this.initialize();
    }

    try {
      await this.drive.files.delete({ fileId });
      console.log('File deleted from Google Drive:', fileId);
    } catch (error) {
      console.error('Error deleting from Google Drive:', error);
      // Don't throw - deletion errors shouldn't break the main flow
    }
  }

  async downloadFile(fileId) {
    if (!this.drive) {
      await this.initialize();
    }

    try {
      const response = await this.drive.files.get({
        fileId,
        alt: 'media'
      });

      return response.data;
    } catch (error) {
      console.error('Error downloading from Google Drive:', error);
      throw error;
    }
  }
}

module.exports = GoogleDriveService;