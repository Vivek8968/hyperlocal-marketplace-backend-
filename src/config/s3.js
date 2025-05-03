const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
require('dotenv').config();

// Configure S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const bucketName = process.env.AWS_S3_BUCKET;

exports.uploadImage = async (buffer, key) => {
  if (!buffer) return null;

  const contentType = 'image/jpeg'; // Default content type

  const randomName = crypto.randomBytes(16).toString('hex');
  const finalKey = `${key}-${randomName}.jpg`;

  const params = {
    Bucket: bucketName,
    Key: finalKey,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read'
  };

  const command = new PutObjectCommand(params);

  try {
    await s3Client.send(command);
    return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${finalKey}`;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw new Error('Failed to upload image');
  }
};

exports.deleteImage = async (url) => {
  if (!url) return false;

  try {
    const urlObj = new URL(url);
    const key = urlObj.pathname.substring(1); // Remove leading slash

    const params = {
      Bucket: bucketName,
      Key: key
    };

    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);

    return true;
  } catch (error) {
    console.error('Error deleting from S3:', error);
    return false;
  }
};

exports.getPresignedUrl = async (key, contentType = 'image/jpeg') => {
  const randomName = crypto.randomBytes(16).toString('hex');
  const finalKey = `${key}-${randomName}`;

  const params = {
    Bucket: bucketName,
    Key: finalKey,
    ContentType: contentType,
    ACL: 'public-read'
  };

  const command = new PutObjectCommand(params);

  try {
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return {
      url: signedUrl,
      fields: {
        key: finalKey,
        'Content-Type': contentType,
        acl: 'public-read'
      },
      fileUrl: `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${finalKey}`
    };
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new Error('Failed to generate upload URL');
  }
};
