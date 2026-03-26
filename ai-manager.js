// AI Model Manager - 多模型自动切换管理器
class AIModelManager {
  constructor() {
    // 配置多个免费模型
    this.models = [
      {
        name: '硅基流动',
        id: 'siliconflow',
        apiUrl: 'https://api.siliconflow.cn/v1/chat/completions',
        apiKey: '', // 用户填写
        model: 'Qwen/Qwen2.5-7B-Instruct',
        priority: 1,
        status: 'active'
      },
      {
        name: 'DeepSeek',
        id: 'deepseek',
        apiUrl: 'https://api.deepseek.com/v1/chat/completions',
        apiKey: '', // 用户填写
        model: 'deepseek-chat',
        priority: 2,
        status: 'active'
      },
      {
        name: '智谱GLM',
        id: 'zhipu',
        apiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        apiKey: '', // 用户填写
        model: 'glm-4-flash',
        priority: 3,
        status: 'active'
      },
      {
        name: '百度千帆',
        id: 'baidu',
        apiUrl: 'https://qianfan.baidubce.com/v2/chat/completions',
        apiKey: '', // 用户填写
        model: 'ernie-speed-128k',
        priority: 4,
        status: 'active'
      },
      {
        name: '阿里通义',
        id: 'aliyun',
        apiUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        apiKey: '', // 用户填写
        model: 'qwen-turbo',
        priority: 5,
        status: 'active'
      }
    ];
    
    this.currentModelIndex = 0;
    this.maxRetries = 3;
  }

  // 设置 API Key
  setApiKey(modelId, apiKey) {
    const model = this.models.find(m => m.id === modelId);
    if (model) {
      model.apiKey = apiKey;
      console.log(`[AI Manager] ${model.name} API Key 已设置`);
    }
  }

  // 获取当前可用模型
  getAvailableModels() {
    return this.models.filter(m => m.status === 'active' && m.apiKey);
  }

  // 智能调用 - 自动切换
  async callAI(messages, options = {}) {
    const availableModels = this.getAvailableModels();
    
    if (availableModels.length === 0) {
      throw new Error('没有可用的 AI 模型，请先配置 API Key');
    }

    // 按优先级排序
    const sortedModels = availableModels.sort((a, b) => a.priority - b.priority);

    for (const model of sortedModels) {
      try {
        console.log(`[AI Manager] 尝试使用 ${model.name}...`);
        const result = await this.callModel(model, messages, options);
        console.log(`[AI Manager] ${model.name} 调用成功`);
        return {
          success: true,
          model: model.name,
          data: result
        };
      } catch (error) {
        console.warn(`[AI Manager] ${model.name} 失败:`, error.message);
        
        // 如果是 Token 用完或配额不足，继续下一个
        if (this.isTokenExhaustedError(error)) {
          console.log(`[AI Manager] ${model.name} Token 用完，自动切换...`);
          continue;
        }
        
        // 其他错误也尝试下一个
        continue;
      }
    }

    throw new Error('所有模型都不可用，请检查 API Key 或稍后重试');
  }

  // 调用单个模型
  async callModel(model, messages, options) {
    const response = await fetch(model.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${model.apiKey}`
      },
      body: JSON.stringify({
        model: model.model,
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API 错误: ${error}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || data.result;
  }

  // 判断是否 Token 用完
  isTokenExhaustedError(error) {
    const errorMsg = error.message.toLowerCase();
    return errorMsg.includes('token') || 
           errorMsg.includes('quota') || 
           errorMsg.includes('limit') ||
           errorMsg.includes('insufficient') ||
           errorMsg.includes('exhausted') ||
           errorMsg.includes('余额不足') ||
           errorMsg.includes('额度');
  }

  // 生成文档
  async generateDocument(topic, type = 'general') {
    const prompts = {
      general: `请写一篇关于"${topic}"的文档，使用 Markdown 格式，包含标题、目录、正文内容。`,
      business: `请写一篇关于"${topic}"的商业计划书，使用 Markdown 格式，包含执行摘要、市场分析、产品介绍、商业模式、财务预测等章节。`,
      technical: `请写一篇关于"${topic}"的技术文档，使用 Markdown 格式，包含概述、架构设计、接口说明、使用示例等。`,
      meeting: `请根据主题"${topic}"生成一份会议纪要模板，包含会议信息、参会人员、讨论内容、行动计划等。`
    };

    const messages = [
      {
        role: 'system',
        content: '你是一个专业的文档写作助手，擅长生成结构清晰、内容专业的 Markdown 格式文档。'
      },
      {
        role: 'user',
        content: prompts[type] || prompts.general
      }
    ];

    return await this.callAI(messages);
  }

  // 优化文档
  async improveDocument(content, action = 'polish') {
    const actions = {
      polish: '润色优化',
      expand: '扩写补充',
      simplify: '简化精简',
      formal: '正式化',
      casual: '口语化'
    };

    const messages = [
      {
        role: 'system',
        content: `你是一个专业的文档编辑，请对以下内容进行"${actions[action]}"处理，保持 Markdown 格式。`
      },
      {
        role: 'user',
        content: content
      }
    ];

    return await this.callAI(messages);
  }

  // 生成图表代码
  async generateDiagram(description) {
    const messages = [
      {
        role: 'system',
        content: '你是一个 Mermaid 图表专家。请根据描述生成 Mermaid 流程图代码，只返回代码，不要其他解释。'
      },
      {
        role: 'user',
        content: `请根据以下描述生成 Mermaid 流程图代码：\n${description}`
      }
    ];

    return await this.callAI(messages);
  }
}

// 全局实例
window.aiManager = new AIModelManager();

console.log('[AI Manager] 多模型管理器已加载');
console.log('[AI Manager] 支持的模型:', window.aiManager.models.map(m => m.name).join(', '));