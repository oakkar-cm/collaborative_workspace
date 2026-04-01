import client from '../client';

export async function exportDocumentDocx(documentId) {
  const response = await client.get(`/documents/${documentId}/export/docx`, {
    responseType: 'blob'
  });
  return response.data;
}

export async function exportDocumentPdf(documentId) {
  const response = await client.get(`/documents/${documentId}/export/pdf`, {
    responseType: 'blob'
  });
  return response.data;
}
