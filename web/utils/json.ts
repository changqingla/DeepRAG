export function parseJSON<T>(json: string | null | undefined, fallback: T): T {
  if (!json) {
    return fallback;
  }
  try {
    const raw = json
      .trim()
      .replace(/^```json\s*/, "")
      .replace(/^```\s*/, "")
      .replace(/\s*```$/, "");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// 解析流式JSON，即使JSON不完整也能提取已有的字段
export function parseStreamingJSON(json: string | null | undefined): {
  locale?: string;
  has_enough_context?: boolean;
  title?: string;
  thought?: string;
  steps?: { title?: string; description?: string; need_web_search?: boolean; step_type?: string }[];
} {
  if (!json) {
    return {};
  }

  const result: any = {};
  
  try {
    // 首先尝试完整的JSON解析
    const cleaned = json.trim().replace(/^```json\s*/, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch {
    // JSON不完整，使用正则提取已有字段
    
    // 提取locale
    const localeMatch = json.match(/"locale"\s*:\s*"([^"]*)"?/);
    if (localeMatch) {
      result.locale = localeMatch[1];
    }
    
    // 提取has_enough_context
    const contextMatch = json.match(/"has_enough_context"\s*:\s*(true|false)/);
    if (contextMatch) {
      result.has_enough_context = contextMatch[1] === 'true';
    }
    
    // 提取title
    const titleMatch = json.match(/"title"\s*:\s*"([^"]*)"?/);
    if (titleMatch) {
      result.title = titleMatch[1];
    }
    
    // 提取thought - 支持多行和转义字符
    const thoughtMatch = json.match(/"thought"\s*:\s*"((?:[^"\\]|\\.|\\n)*)"/s);
    if (thoughtMatch) {
      result.thought = thoughtMatch[1]
        .replace(/\\"/g, '"')
        .replace(/\\n/g, '\n')
        .replace(/\\\\/g, '\\');
    }
    
    // 提取steps数组
    const stepsMatch = json.match(/"steps"\s*:\s*\[(.*?)(?:\]|$)/s);
    if (stepsMatch) {
      const stepsContent = stepsMatch[1];
      const steps: any[] = [];
      
      // 先尝试解析完整的steps数组
      try {
        const stepsArray = JSON.parse('[' + stepsContent + (stepsContent.trim().endsWith(']') ? '' : ']'));
        steps.push(...stepsArray);
      } catch {
        // 如果完整解析失败，逐个提取step对象
        const stepMatches = stepsContent.matchAll(/\{[^}]*\}/g);
        for (const stepMatch of stepMatches) {
          try {
            const step = JSON.parse(stepMatch[0]);
            steps.push(step);
          } catch {
            // 如果step对象不完整，尝试提取部分字段
            const stepStr = stepMatch[0];
            const stepObj: any = {};
            
            const stepTitleMatch = stepStr.match(/"title"\s*:\s*"([^"]*)"?/);
            if (stepTitleMatch) {
              stepObj.title = stepTitleMatch[1];
            }
            
            const stepDescMatch = stepStr.match(/"description"\s*:\s*"([^"]*)"?/);
            if (stepDescMatch) {
              stepObj.description = stepDescMatch[1];
            }
            
            const needWebMatch = stepStr.match(/"need_web_search"\s*:\s*(true|false)/);
            if (needWebMatch) {
              stepObj.need_web_search = needWebMatch[1] === 'true';
            }
            
            const stepTypeMatch = stepStr.match(/"step_type"\s*:\s*"([^"]*)"?/);
            if (stepTypeMatch) {
              stepObj.step_type = stepTypeMatch[1];
            }
            
            if (stepObj.title || stepObj.description) {
              steps.push(stepObj);
            }
          }
        }
      }
      
      if (steps.length > 0) {
        result.steps = steps;
      }
    }
    
    return result;
  }
} 