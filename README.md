# DeepRAG

一个基于 RAG (Retrieval-Augmented Generation) 技术的智能问答系统，提供文档处理、知识检索和智能生成能力。

## 🚀 项目简介

DeepRAG 是一个完整的 RAG 解决方案，集成了现代化的前后端技术栈，支持多种文档格式的处理和智能问答功能。项目采用微服务架构，便于扩展和维护。

## 📋 主要功能

- 📄 **文档处理**: 支持多种格式文档的上传、解析和预处理
- 🔍 **智能检索**: 基于向量数据库的语义检索能力
- 🤖 **智能问答**: 结合检索内容的AI对话生成
- 👥 **用户管理**: 完整的用户认证和权限管理系统
- 🔧 **API接口**: RESTful API 支持第三方集成
- 📊 **数据管理**: 支持文件存储和元数据管理

## 🛠️ 技术架构

### 后端技术栈
- **Python Flask**: 主要后端框架
- **MySQL**: 关系型数据库存储
- **Elasticsearch**: 全文检索和向量检索
- **Redis**: 缓存和会话管理
- **MinIO**: 对象存储服务
- **JWT**: 用户认证

### 前端技术栈
- **Next.js 15**: React 全栈框架
- **TypeScript**: 类型安全的JavaScript
- **Tailwind CSS**: 实用优先的CSS框架
- **Radix UI**: 现代化的UI组件库
- **React Hook Form**: 表单管理
- **Zustand**: 状态管理

### 部署技术
- **Docker**: 容器化部署
- **Docker Compose**: 多服务编排
- **Nginx**: 反向代理和负载均衡

## 📦 项目结构

```
DeepRAG/
├── src/                    # 后端Python代码
│   ├── main_app_me_api.py  # 用户API服务
│   ├── generate_api.py     # 生成API服务
│   ├── file_api.py         # 文件处理API
│   ├── minio_config.py     # 存储配置
│   └── db_utils.py         # 数据库工具
├── web/                    # 前端Next.js项目
│   ├── app/               # 应用页面
│   ├── components/        # React组件
│   ├── hooks/            # 自定义Hooks
│   ├── lib/              # 工具库
│   └── styles/           # 样式文件
├── docker/                # Docker配置
│   ├── docker-compose.yml
│   ├── docker-compose-base.yml
│   ├── nginx/            # Nginx配置
│   └── service_conf.yaml.template
├── data/                 # 数据存储目录
│   ├── mysql_data/       # MySQL数据
│   ├── es_data/          # Elasticsearch数据
│   ├── redis_data/       # Redis数据
│   └── minio_data/       # MinIO数据
└── public/               # 静态资源
```

**更多后端接口代码即将开放**


## 🚀 快速开始

### 环境要求

- Docker & Docker Compose
- Node.js 18+ (用于本地开发)
- Python 3.8+ (用于本地开发)

### 1. 克隆项目

```bash
git clone <repository-url>
cd DeepRAG
```

### 2. 环境配置

复制并配置环境变量文件：

```bash
cp docker/.env.example docker/.env
```

编辑 `docker/.env` 文件，配置相关参数：

```env
# 数据库配置
MYSQL_PASSWORD=your_mysql_password
MYSQL_PORT=5455

# Elasticsearch配置
ELASTIC_PASSWORD=your_es_password
ES_PORT=9200

# Redis配置
REDIS_PASSWORD=your_redis_password
REDIS_PORT=6379

# MinIO配置
MINIO_USER=your_minio_user
MINIO_PASSWORD=your_minio_password
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001

# 服务配置
SVR_HTTP_PORT=9380
DEEP_RAG_IMAGE=your_deeprag_image
TIMEZONE=Asia/Shanghai
```

### 3. 启动服务

使用Docker Compose启动所有服务：

```bash
cd docker
docker-compose up -d
```

### 4. 访问服务

- **前端界面**: http://localhost:8088
- **后端API**: http://localhost:9380
- **MinIO控制台**: http://localhost:9001
- **Elasticsearch**: http://localhost:9200

## 🔧 开发指南

### 后端开发

1. 安装Python依赖：
```bash
pip install flask pymysql jwt
```

2. 运行后端服务：
```bash
cd src
python main_app_me_api.py
```

### 前端开发

1. 安装Node.js依赖：
```bash
cd web
npm install
```

2. 启动开发服务器：
```bash
npm run dev
```

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 创建 Issue
- 发送邮件至 [ht20201031@163.com]

## 🙏 致谢

特别感谢以下开源项目的启发和技术支持：

- [RAGFlow](https://github.com/infiniflow/ragflow) - 基于深度文档理解的开源RAG引擎，为本项目提供了核心技术架构和实现思路
- [Deer-Flow](https://github.com/bytedance/deer-flow.git) - 字节跳动开源的工作流引擎，为本项目的流程管理提供了重要参考