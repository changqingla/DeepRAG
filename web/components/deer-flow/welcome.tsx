export function Welcome() {
  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-8">
      <div className="mb-6 text-6xl">👋</div>
      <h2 className="text-4xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
        你好，欢迎！
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-xl">
        欢迎使用 DeepRAG，这是一个基于前沿语言模型构建的深度研究助手，
        可以帮助您在网络上搜索、浏览信息，以及处理复杂任务。
      </p>
    </div>
  );
} 