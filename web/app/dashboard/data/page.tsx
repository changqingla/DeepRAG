"use client"
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { MoreHorizontal, FileText, Folder as FolderIcon, Clock, Trash2, Plus, Home, ChevronRight, Upload, Check, FileCode, AlertCircle, FileDown, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CreateFolderDialog, FolderData as CreateFolderDialogData } from "@/components/dashboard/create-folder-dialog"
import { useRouter } from "next/navigation"
import {
  getFolders,
  getFiles,
  createFolderAPI,
  deleteFolderAPI,
  deleteFileAPI,
  uploadFileAPI,
  batchUploadFilesAPI,
  convertFileToMarkdownAPI,
  saveMarkdownFileAPI,
  Folder as ApiFolder, // Renamed to avoid conflict with FolderIcon
  FileItem as ApiFile,  // Renamed for clarity
} from "@/app/services/fileManagerService";

// Type for path items in breadcrumbs
interface PathItem {
  id: string | null;
  name: string;
}

// Combined type for items displayed in the grid
interface DisplayItem extends Partial<ApiFolder>, Partial<ApiFile> {
  isFolder: boolean;
  // id, name are common. Other fields depend on whether it's a folder or file.
}

export default function DataPage() {
  // 获取toast函数
  const { toast } = useToast();
  const router = useRouter();

  // Path and current folder/file states
  const [path, setPath] = useState<PathItem[]>([{ id: null, name: "根目录" }]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<ApiFolder[]>([]);
  const [files, setFiles] = useState<ApiFile[]>([]);
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [isUploading, setIsUploading] = useState(false);
  
  // 多选状态
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  // File upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination states (can be expanded later if needed for UI controls)
  // For now, loading all items in a folder, or first page with a large size.
  const [folderPage, setFolderPage] = useState(1);
  const [filePage, setFilePage] = useState(1);
  const defaultPageSize = 100; // Load many items per folder for now

  // Dialog state
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false);

  // 组织文件，建立原始文件和衍生文件的关系
  const organizeFiles = useCallback((files: ApiFile[]) => {
    const derivedFiles: Record<string, ApiFile[]> = {};
    const regularFiles: ApiFile[] = [];
    
    console.log("原始文件列表:", files);
    
    files.forEach(file => {
      console.log("处理文件:", file.name, "derived_from_file_id:", file.derived_from_file_id);
      if (file.derived_from_file_id) {
        if (!derivedFiles[file.derived_from_file_id]) {
          derivedFiles[file.derived_from_file_id] = [];
        }
        derivedFiles[file.derived_from_file_id].push(file);
      } else {
        regularFiles.push(file);
      }
    });
    
    console.log("衍生文件映射:", derivedFiles);
    console.log("常规文件:", regularFiles);
    
    return { regularFiles, derivedFiles };
  }, []);

  // 判断文件是否为Markdown文件
  const isMarkdownFile = (file: ApiFile): boolean => {
    return file.name.toLowerCase().endsWith('.md') || file.type === 'text/markdown';
  };

  // 获取文件的组织结构
  const { regularFiles, derivedFiles } = useMemo(() => organizeFiles(files), [files, organizeFiles]);

  // Combined and sorted items for display
  const displayItems: DisplayItem[] = [
    ...folders.map(f => ({ ...f, isFolder: true })),
    ...files.map(f => ({ ...f, isFolder: false })),
  ].sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    return (a.name ?? '').localeCompare(b.name ?? '');
  });

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Function to fetch data for the current folderId
  const fetchData = useCallback(async (folderId: string | null) => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch folders and files in parallel
      const [foldersResponse, filesResponse] = await Promise.all([
        getFolders(folderId, folderPage, defaultPageSize),
        getFiles(folderId, filePage, defaultPageSize),
      ]);
      setFolders(foldersResponse.items || []);
      setFiles(filesResponse.items || []);
      // 重置选中项
      setSelectedItems([]);
    } catch (err: any) {
      setError(err.message || "获取数据失败");
      setFolders([]);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [folderPage, filePage]); // Dependencies for pagination if implemented

  // Effect to load data when currentFolderId changes
  useEffect(() => {
    fetchData(currentFolderId);
  }, [currentFolderId, fetchData]);

  const handleFolderClick = (folder: ApiFolder) => {
    setCurrentFolderId(folder.id);
    // Add to path, ensuring no duplicates if user clicks back and forth quickly (though UI should prevent)
    setPath(prevPath => [...prevPath, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (pathItem: PathItem, index: number) => {
    setCurrentFolderId(pathItem.id);
    setPath(prevPath => prevPath.slice(0, index + 1));
  };

  const handleDeleteItem = async (item: DisplayItem) => {
    const confirmMessage = item.isFolder 
      ? "您确定要删除这个文件夹及其所有内容吗？此操作无法撤销。"
      : "您确定要删除这个文件吗？此操作无法撤销。";

    if (window.confirm(confirmMessage)) {
      setIsLoading(true);
      try {
        if (item.isFolder && item.id) {
          await deleteFolderAPI(item.id);
        } else if (!item.isFolder && item.id) {
          await deleteFileAPI(item.id);
        }
        // Refresh data for the current folder
        await fetchData(currentFolderId);
      } catch (err: any) {
        setError(err.message || "删除失败");
        // Optionally re-fetch even on error to ensure UI consistency if backend state changed partially
        // await fetchData(currentFolderId); 
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const handleCreateFolder = async (data: CreateFolderDialogData) => {
    setIsLoading(true);
    try {
      // The description from dialog is not used in current createFolderAPI
      await createFolderAPI(data.name, currentFolderId);
      setIsCreateFolderDialogOpen(false);
      // Refresh data for the current folder
      await fetchData(currentFolderId);
    } catch (err: any) {
      setError(err.message || "创建文件夹失败");
      // Keep dialog open or handle error appropriately if needed
    } finally {
      setIsLoading(false);
    }
  };

  // 处理文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    setError(null);
    
    // 创建进度跟踪对象
    const newProgress: {[key: string]: number} = {};
    Array.from(files).forEach(file => {
      newProgress[file.name] = 0;
    });
    setUploadProgress(newProgress);
    
    try {
      // 使用文件管理服务上传文件
      if (files.length === 1) {
        // 单个文件上传
        const result = await uploadFileAPI(files[0], currentFolderId);
        if (result.code !== 0) {
          throw new Error(result.message || '文件上传失败');
        }
      } else {
        // 批量文件上传
        const filesArray = Array.from(files);
        const result = await batchUploadFilesAPI(
          filesArray,
          currentFolderId,
          null, // 可以传入用户ID作为创建者
          (fileName, progress) => {
            // 更新进度回调
            setUploadProgress(prev => ({
              ...prev,
              [fileName]: progress
            }));
          }
        );
        
        if (result.code !== 0) {
          throw new Error(result.message || '批量文件上传失败');
        }
      }
      
      // 刷新文件列表
      await fetchData(currentFolderId);
      
      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err.message || '文件上传过程中发生错误');
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  };
  
  // 触发文件选择
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // 处理选择/取消选择单个项目
  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => {
      if (prev.includes(id)) {
        return prev.filter(itemId => itemId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // 处理全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(displayItems.map(item => item.id!).filter(Boolean));
    } else {
      setSelectedItems([]);
    }
  };

  // 处理批量删除
  const handleBatchDelete = async () => {
    if (selectedItems.length === 0) return;
    
    const folderCount = selectedItems.filter(id => 
      folders.some(folder => folder.id === id)
    ).length;
    
    const fileCount = selectedItems.filter(id => 
      files.some(file => file.id === id)
    ).length;
    
    const confirmMessage = `您确定要删除所选的 ${folderCount > 0 ? `${folderCount}个文件夹` : ''} ${folderCount > 0 && fileCount > 0 ? '和' : ''} ${fileCount > 0 ? `${fileCount}个文件` : ''}吗？此操作无法撤销。`;
    
    if (window.confirm(confirmMessage)) {
      setIsLoading(true);
      try {
        // 删除所有选中的文件夹和文件
        for (const id of selectedItems) {
          const isFolder = folders.some(folder => folder.id === id);
          if (isFolder) {
            await deleteFolderAPI(id);
          } else {
            await deleteFileAPI(id);
          }
        }
        // 刷新数据
        await fetchData(currentFolderId);
      } catch (err: any) {
        setError(err.message || "批量删除失败");
      } finally {
        setIsLoading(false);
      }
    }
  };

  // 添加转换状态
  const [isConverting, setIsConverting] = useState<Record<string, boolean>>({});
  const [conversionSuccess, setConversionSuccess] = useState<Record<string, boolean>>({});
  const [conversionError, setConversionError] = useState<Record<string, string>>({});

  // 转换为Markdown格式
  const convertToMarkdown = async (file: ApiFile) => {
    if (!file || !file.id || !file.name) {
      toast({
        variant: "destructive",
        title: "错误",
        description: "无效的文件信息，无法进行转换。",
      });
      return;
    }

    const fileId = file.id; // Cache file.id

    setIsConverting(prev => ({ ...prev, [fileId]: true }));
    setConversionSuccess(prev => { const updated = { ...prev }; delete updated[fileId]; return updated; });
    setConversionError(prev => { const updated = { ...prev }; delete updated[fileId]; return updated; });

    try {
      toast({
        title: "处理中",
        description: `正在转换文件 "${file.name}" 为Markdown...`,
      });
      const conversionResult = await convertFileToMarkdownAPI(fileId);

      if (conversionResult.success && conversionResult.markdown_content) {
        toast({
          title: "转换成功",
          description: `文件 "${conversionResult.file_name || file.name}" 已成功转换为Markdown。正在保存...`,
        });

        const originalName = conversionResult.file_name || file.name;
        const baseName = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;
        const markdownFilename = `${baseName}.md`;

        const saveResult = await saveMarkdownFileAPI(fileId, conversionResult.markdown_content, markdownFilename);

        if (saveResult.code === 0 && saveResult.data) {
          toast({
            title: "保存成功",
            description: `Markdown 文件 "${saveResult.data.name}" 已成功保存到系统中。`,
          });
          await fetchData(currentFolderId);
          setConversionSuccess(prev => ({ ...prev, [fileId]: true }));
        } else {
          throw new Error(saveResult.message || "保存Markdown文件失败");
        }
      } else {
        throw new Error(conversionResult.message || "Markdown转换失败");
      }
    } catch (error: any) {
      console.error("Markdown 转换或保存操作失败:", error);
      const errorMessage = error.message || "处理Markdown文件时发生未知错误。";
      setConversionError(prev => ({ ...prev, [fileId]: errorMessage }));
      toast({
        variant: "destructive",
        title: "操作失败",
        description: errorMessage,
      });
    } finally {
      setIsConverting(prev => ({ ...prev, [fileId]: false }));
    }
  };

  // 添加预览功能
  const handlePreviewFile = (originalFile: ApiFile, derivedFile: ApiFile) => {
    if (!originalFile.id || !derivedFile.id) {
      toast({
        variant: "destructive",
        title: "错误",
        description: "文件信息不完整，无法预览。",
      });
      return;
    }
    
    // 导航到预览页面
    router.push(`/dashboard/data/compare/${originalFile.id}/${derivedFile.id}`);
  };

  return (
    <div className="flex flex-col w-full h-full p-4 bg-gray-50 dark:bg-gray-900">
      {/* Breadcrumbs and Top Control Bar */}
      <div className="flex items-center justify-between mb-4">
        {/* Breadcrumbs */}
        <nav className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          {path.map((pItem, index) => (
            <div key={pItem.id || 'root'} className="flex items-center">
              {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
              <Button
                variant="link"
                className={`px-1 ${index === path.length - 1 ? 'text-gray-700 dark:text-gray-200 font-semibold' : 'hover:underline'}`}
                onClick={() => handleBreadcrumbClick(pItem, index)}
                disabled={index === path.length - 1}
              >
                {pItem.name}
              </Button>
            </div>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {/* 上传文件按钮 - 只在文件夹内部显示 */}
          {currentFolderId && (
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center shadow-sm hover:shadow-md transition-all duration-200"
              onClick={triggerFileUpload}
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-1.5" />
              {isUploading ? "上传中..." : "上传文件"}
            </Button>
          )}
          
          {/* 隐藏的文件输入 */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          
          {/* 新建文件夹按钮 - 只在根目录显示 */}
          {!currentFolderId && (
        <Button 
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center shadow-sm hover:shadow-md transition-all duration-200"
              onClick={() => setIsCreateFolderDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          新建文件夹
        </Button>
          )}
          
          {/* 批量删除按钮 - 仅当有选中项时显示 */}
          {selectedItems.length > 0 && (
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center shadow-sm hover:shadow-md transition-all duration-200"
              onClick={handleBatchDelete}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              删除所选 ({selectedItems.length})
            </Button>
          )}
        </div>
      </div>

      {/* Loading and Error States */}
      {isLoading && <div className="text-center py-4">加载中...</div>}
      {error && <div className="text-center py-4 text-red-500">错误: {error}</div>}
      
      {/* 上传进度提示 */}
      {isUploading && Object.keys(uploadProgress).length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">文件上传中...</h3>
          {Object.entries(uploadProgress).map(([filename, progress]) => (
            <div key={filename} className="flex items-center mb-1">
              <span className="text-xs text-gray-600 truncate w-64">{filename}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2 ml-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="text-xs text-gray-600 ml-2 w-8 text-right">{progress}%</span>
            </div>
          ))}
        </div>
      )}

      {/* 表格视图 (文件夹和文件) */}
      {!isLoading && !error && (
        <div className="flex flex-col h-full bg-white border rounded-lg shadow-sm overflow-hidden">
          {/* 表头 - 根据是否在根目录显示不同的列 */}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 border-b text-xs font-medium text-gray-500">
            <div className="col-span-1 flex items-center">
              <Checkbox 
                id="select-all" 
                checked={selectedItems.length > 0 && selectedItems.length === displayItems.filter(item => item.id).length}
                onCheckedChange={(checked) => handleSelectAll(checked === true)}
              />
            </div>
            {!currentFolderId ? (
              // 根目录表头
              <>
                <div className="col-span-8">名称</div>
                <div className="col-span-2">上传时间</div>
                <div className="col-span-1 text-right">操作</div>
              </>
            ) : (
              // 文件夹内表头
              <>
                <div className="col-span-6">名称</div>
                <div className="col-span-3">文件大小</div>
                <div className="col-span-1">上传时间</div>
                <div className="col-span-1 text-right">操作</div>
              </>
            )}
          </div>

          {/* 文件和文件夹列表 */}
          <div className="overflow-y-auto flex-grow">
            {displayItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500 italic">此文件夹为空</div>
            ) : (
              <div>
                {/* 先显示所有文件夹 */}
                {folders.map((folder) => (
                  <div 
                    key={folder.id} 
                    className="grid grid-cols-12 gap-2 px-4 py-3 border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => folder.id && handleFolderClick(folder)}
                  >
                    <div className="col-span-1 flex items-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={folder.id ? selectedItems.includes(folder.id) : false}
                        onCheckedChange={() => folder.id && handleSelectItem(folder.id)}
                        disabled={!folder.id}
                      />
                    </div>

                    {!currentFolderId ? (
                      // 根目录行
                      <>
                        <div className="col-span-8 flex items-center">
                          <div className="mr-3">
                            <FolderIcon className="h-5 w-5 text-indigo-500" />
                          </div>
                          <span className="truncate font-medium" title={folder.name}>{folder.name}</span>
                        </div>
                        <div className="col-span-2 text-sm text-gray-500 flex items-center">
                          {new Date(folder.created_at!).toLocaleDateString()}
                        </div>
                        <div className="col-span-1 flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-full w-8 h-8"
                              >
                                <MoreHorizontal className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleDeleteItem({...folder, isFolder: true})}
                                className="text-red-500 hover:!text-red-700 hover:!bg-red-100 dark:hover:!bg-red-800/30 cursor-pointer flex items-center"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </>
                    ) : (
                      // 文件夹内行
                      <>
                        <div className="col-span-6 flex items-center">
                          <div className="mr-3">
                            <FolderIcon className="h-5 w-5 text-indigo-500" />
                          </div>
                          <span className="truncate font-medium" title={folder.name}>{folder.name}</span>
                        </div>
                        <div className="col-span-3 text-sm text-gray-500 flex items-center">
                          {'-'}
                        </div>
                        <div className="col-span-1 text-sm text-gray-500 flex items-center">
                          {new Date(folder.created_at!).toLocaleDateString()}
                        </div>
                        <div className="col-span-1 flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-full w-8 h-8"
                              >
                                <MoreHorizontal className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleDeleteItem({...folder, isFolder: true})}
                                className="text-red-500 hover:!text-red-700 hover:!bg-red-100 dark:hover:!bg-red-800/30 cursor-pointer flex items-center"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {/* 显示常规文件和它们的衍生文件 */}
                {regularFiles.map((file) => (
                  <React.Fragment key={file.id}>
                    {/* 原始文件行 */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b hover:bg-gray-50">
                      <div className="col-span-1 flex items-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={file.id ? selectedItems.includes(file.id) : false}
                          onCheckedChange={() => file.id && handleSelectItem(file.id)}
                          disabled={!file.id}
                        />
                      </div>

                      {!currentFolderId ? (
                        // 根目录行
                        <>
                          <div className="col-span-8 flex items-center">
                            <div className="mr-3">
                              <FileText className="h-5 w-5 text-gray-400" />
                            </div>
                            <span className="truncate font-medium" title={file.name}>{file.name}</span>
                          </div>
                          <div className="col-span-2 text-sm text-gray-500 flex items-center">
                            {new Date(file.upload_date!).toLocaleDateString()}
                </div>
                          <div className="col-span-1 flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-full w-8 h-8"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteItem({...file, isFolder: false})}
                                  className="text-red-500 hover:!text-red-700 hover:!bg-red-100 dark:hover:!bg-red-800/30 cursor-pointer flex items-center"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </>
                      ) : (
                        // 文件夹内行
                        <>
                          <div className="col-span-6 flex items-center">
                            <div className="mr-3">
                              <FileText className="h-5 w-5 text-gray-400" />
                            </div>
                            <span className="truncate font-medium" title={file.name}>{file.name}</span>
                            {/* 如果有衍生文件，显示一个指示器 */}
                            {derivedFiles[file.id!]?.length > 0 && (
                              <span className="ml-2 text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">
                                {derivedFiles[file.id!].length}个衍生文件
                              </span>
                            )}
                          </div>
                          <div className="col-span-3 text-sm text-gray-500 flex items-center">
                            {file.size ? formatFileSize(file.size) : '-'}
                          </div>
                          <div className="col-span-1 text-sm text-gray-500 flex items-center">
                            {new Date(file.upload_date!).toLocaleDateString()}
                          </div>
                          <div className="col-span-1 flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                            {/* 只在非Markdown文件上显示转换按钮 */}
                            {!isMarkdownFile(file) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100 rounded-full w-7 h-7"
                                title="转换为Markdown"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  convertToMarkdown(file);
                                }}
                                disabled={isConverting[file.id!] || false}
                              >
                                {isConverting[file.id!] ? (
                                  <span className="animate-spin h-4 w-4 border-2 border-indigo-500 border-opacity-50 border-t-indigo-500 rounded-full"></span>
                                ) : conversionError[file.id!] ? (
                                  <AlertCircle className="h-4 w-4 text-red-500" />
                                ) : conversionSuccess[file.id!] ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <FileCode className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-full w-8 h-8"
                                >
                                  <MoreHorizontal className="h-5 w-5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteItem({...file, isFolder: false})}
                                  className="text-red-500 hover:!text-red-700 hover:!bg-red-100 dark:hover:!bg-red-800/30 cursor-pointer flex items-center"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* 显示该文件的衍生文件 */}
                    {derivedFiles[file.id!]?.map((derivedFile) => (
                      <div 
                        key={derivedFile.id} 
                        className="grid grid-cols-12 gap-2 px-4 py-3 border-b hover:bg-gray-50 bg-blue-50/20"
                        style={{ paddingLeft: '3rem' }}
                      >
                        <div className="col-span-1">
                          {/* 已移除选择框 */}
                        </div>

                        <div className="col-span-6 flex items-center">
                          <div className="mr-3">
                            <FileDown className="h-5 w-5 text-blue-500" />
                          </div>
                          <span className="truncate font-medium text-blue-600" title={derivedFile.name}>
                            {derivedFile.name}
                          </span>
                        </div>
                        <div className="col-span-3 text-sm text-gray-500 flex items-center">
                          {derivedFile.size ? formatFileSize(derivedFile.size) : '-'}
                        </div>
                        <div className="col-span-1 text-sm text-gray-500 flex items-center">
                          {new Date(derivedFile.upload_date!).toLocaleDateString()}
                        </div>
                        <div className="col-span-1 flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-full w-7 h-7"
                            title="预览对比"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewFile(file, derivedFile);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-full w-8 h-8"
                              >
                                <MoreHorizontal className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleDeleteItem({...derivedFile, isFolder: false})}
                                className="text-red-500 hover:!text-red-700 hover:!bg-red-100 dark:hover:!bg-red-800/30 cursor-pointer flex items-center"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
      </div>
      )}
      
      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={isCreateFolderDialogOpen}
        onOpenChange={setIsCreateFolderDialogOpen}
        onCreateFolder={handleCreateFolder}
      />
    </div>
  )
}
