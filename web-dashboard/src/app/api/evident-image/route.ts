import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('file_id');
  
  if (!fileId) {
    return new NextResponse('Missing file_id', { status: 400 });
  }
  
  const botToken = process.env.BOT_TOKEN || '';
  
  if (!botToken) {
    return new NextResponse('BOT_TOKEN not configured on server', { status: 500 });
  }
  
  try {
    // 1. Get file path from Telegram API
    const getFileUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`;
    const fileResponse = await fetch(getFileUrl);
    const fileData = await fileResponse.json();
    
    if (!fileData.ok || !fileData.result?.file_path) {
      console.error('Telegram getFile failed:', fileData);
      return new NextResponse('Failed to get file path from Telegram', { status: 500 });
    }
    
    const filePath = fileData.result.file_path;
    
    // 2. Fetch image content from Telegram file server
    const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
    const imageResponse = await fetch(downloadUrl);
    
    if (!imageResponse.ok) {
      return new NextResponse('Failed to download file from Telegram', { status: 500 });
    }
    
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error fetching Telegram file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
