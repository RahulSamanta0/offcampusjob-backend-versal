import path from 'path';

const getDataUri = (file) => {
  const extension = path.extname(file.originalname).toString().toLowerCase();
  
  // Convert the file buffer to a base64-encoded Data URI
  const base64String = file.buffer.toString('base64');

  return {
    content: `data:image/${extension};base64,${base64String}`,
  };
};

export default getDataUri;