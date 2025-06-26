"use client"

/**
 * 解析聊天流响应（OpenAI兼容格式）
 * 客户端工具函数，处理从服务器返回的流数据
 */
export function parseStreamData(data: string) {
  try {
    // 检查数据是否以 "data:" 开头
    if (!data.startsWith('data:')) {
      console.warn('Unexpected data format:', data);
      return null;
    }
    
    // 移除 "data:" 前缀
    const jsonStr = data.replace(/^data:/, '').trim();
    
    // 如果是 [DONE] 标记，返回null
    if (jsonStr === '[DONE]') {
      return null;
    }
    
    // 检查是否是空数据
    if (!jsonStr) {
      return null;
    }
    
    try {
      // 尝试解析JSON数据
      const parsed = JSON.parse(jsonStr);
      
      // 提取内容（OpenAI格式）
      if (parsed.choices && parsed.choices[0]) {
        const choice = parsed.choices[0];
        
        // 增量内容 delta 格式
        if (choice.delta && choice.delta.content) {
          return {
            content: choice.delta.content,
            id: parsed.id
          };
        }
        
        // 完整消息 message 格式
        if (choice.message && choice.message.content) {
          return {
            content: choice.message.content,
            id: parsed.id
          };
        }
      }
      
      // 如果没有有效内容，但有ID，返回空对象
      if (parsed.id) {
        return { id: parsed.id };
      }
      
      return null;
    } catch (jsonError) {
      // JSON解析失败，尝试直接处理
      console.warn('JSON parse error:', jsonError, 'Raw data:', jsonStr);
      
      // 如果数据以 {"id" 开头，可能是JSON字符串中多了一个data:前缀
      if (jsonStr.includes('"id"') && jsonStr.includes('"content"')) {
        // 尝试查找并提取内容
        const contentMatch = jsonStr.match(/"content"\s*:\s*"([^"]*)"/) || [];
        const idMatch = jsonStr.match(/"id"\s*:\s*"([^"]*)"/) || [];
        
        if (contentMatch[1] || idMatch[1]) {
          return {
            content: contentMatch[1] || '',
            id: idMatch[1] || ''
          };
        }
      }
      
      // 如果不是有效的JSON，但看起来包含了内容，尝试直接返回
      if (jsonStr.length > 0) {
        return {
          content: jsonStr,
          id: new Date().getTime().toString()
        };
      }
      
      return null;
    }
  } catch (error) {
    console.error('解析流数据时出错:', error);
    return null;
  }
}

/**
 * 处理SSE流数据
 * @param stream ReadableStream对象
 * @param onData 数据处理回调
 */
export async function processStream(
  stream: ReadableStream,
  onData: (data: any) => void
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let done = false;
  let buffer = '';
  
  try {
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      
      if (value) {
        // 解码当前块并与之前的缓冲区合并
        const chunkText = decoder.decode(value, { stream: true });
        buffer += chunkText;
        
        // 查找完整的行（以\n或\r\n结尾）
        const lines = buffer.split(/\r?\n/);
        
        // 保留最后一行（可能不完整）为新的缓冲区
        buffer = lines.pop() || '';
        
        // 处理所有完整的行
        for (const line of lines) {
          if (line.trim() !== '') {
            // 解析流数据
            const parsedData = parseStreamData(line);
            
            // 如果解析成功，调用回调函数
            if (parsedData !== null) {
              onData(parsedData);
            }
          }
        }
      }
    }
    
    // 处理最后的缓冲区（如果有）
    if (buffer.trim() !== '') {
      const parsedData = parseStreamData(buffer);
      if (parsedData !== null) {
        onData(parsedData);
      }
    }
  } catch (error) {
    console.error('处理流数据时出错:', error);
    throw error;
  } finally {
    // 确保释放reader
    reader.releaseLock();
  }
} 