const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

class S3Service {
  /**
   * Upload an image to S3
   * @param {String} base64Image - Base64 encoded image
   * @param {String} path - Path within bucket
   * @returns {String} - URL of uploaded image
   */
  async uploadImage(base64Image, path) {
    try {
      // Extract actual base64 data
      const base64Data = this._extractBase64Data(base64Image);
      
      // Determine file type from base64 header
      const fileType = this._getFileTypeFromBase64(base64Image);
      
      // Generate unique filename
      const fileName = `${path}/${uuidv4()}.${fileType}`;
      
      // Upload to S3
      const params = {
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: Buffer.from(base64Data, 'base64'),
        ContentType: `image/${fileType}`,
        ACL: 'public-read'
      };
      
      const uploadResult = await s3.upload(params).promise();
      return uploadResult.Location;
    } catch (error) {
      console.error('S3 Upload Error:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  /**
   * Delete an image from S3
   * @param {String} imageUrl - URL of image to delete
   * @returns {Boolean} - Success status
   */
  async deleteImage(imageUrl) {
    try {
      // Extract key from URL
      const key = this._extractKeyFromUrl(imageUrl);
      
      if (!key) {
        throw new Error('Invalid S3 URL');
      }
      
      // Delete from S3
      const params = {
        Bucket: BUCKET_NAME,
        Key: key
      };
      
      await s3.deleteObject(params).promise();
      return true;
    } catch (error) {
      console.error('S3 Delete Error:', error);
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }

  /**
   * Upload multiple images to S3
   * @param {Array} base64Images - Array of base64 encoded images
   * @param {String} path - Path within bucket
   * @returns {Array} - Array of URLs of uploaded images
   */
  async uploadMultipleImages(base64Images, path) {
    try {
      const uploadPromises = base64Images.map((image, index) => 
        this.uploadImage(image, `${path}/${index}`)
      );
      
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('S3 Batch Upload Error:', error);
      throw new Error(`Failed to upload images: ${error.message}`);
    }
  }

  /**
   * Generate a pre-signed URL for direct uploading
   * @param {String} path - Path within bucket
   * @param {String} contentType - Content type of file
   * @returns {Object} - Pre-signed URL and fields
   */
  async getPresignedUrl(path, contentType) {
    try {
      const fileName = `${path}/${uuidv4()}`;
      
      const params = {
        Bucket: BUCKET_NAME,
        Key: fileName,
        Expires: 300, // URL expires in 5 minutes
        ContentType: contentType,
        ACL: 'public-read'
      };
      
      const presignedUrl = await s3.getSignedUrlPromise('putObject', params);
      
      return {
        url: presignedUrl,
        key: fileName,
        finalUrl: `https://${BUCKET_NAME}.s3.amazonaws.com/${fileName}`
      };
    } catch (error) {
      console.error('S3 Presigned URL Error:', error);
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  /**
   * Extract base64 data from a base64 image string
   * @param {String} base64Image - Base64 encoded image
   * @returns {String} - Base64 data
   * @private
   */
  _extractBase64Data(base64Image) {
    // Remove data URI header if present
    if (base64Image.includes(';base64,')) {
      return base64Image.split(';base64,').pop();
    }
    return base64Image;
  }

  /**
   * Get file type from base64 image header
   * @param {String} base64Image - Base64 encoded image
   * @returns {String} - File type (jpg, png, etc.)
   * @private
   */
  _getFileTypeFromBase64(base64Image) {
    // Default to jpeg if can't determine
    if (!base64Image.includes(';base64,')) {
      return 'jpeg';
    }
    
    const header = base64Image.split(';base64,')[0];
    
    if (header.includes('image/')) {
      const fileType = header.split('image/').pop();
      return fileType === 'jpeg' || fileType === 'jpg' ? 'jpeg' : fileType;
    }
    
    return 'jpeg';
  }

  /**
   * Extract S3 key from a full URL
   * @param {String} url - S3 URL
   * @returns {String} - S3 key
   * @private
   */
  _extractKeyFromUrl(url) {
    try {
      // Handle different S3 URL formats
      if (url.includes(`${BUCKET_NAME}.s3.amazonaws.com/`)) {
        return url.split(`${BUCKET_NAME}.s3.amazonaws.com/`)[1];
      } else if (url.includes(`s3.amazonaws.com/${BUCKET_NAME}/`)) {
        return url.split(`s3.amazonaws.com/${BUCKET_NAME}/`)[1];
      } else if (url.includes(`${process.env.AWS_CLOUDFRONT_DOMAIN}/`)) {
        return url.split(`${process.env.AWS_CLOUDFRONT_DOMAIN}/`)[1];
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting key from URL:', error);
      return null;
    }
  }
}

module.exports = new S3Service();

