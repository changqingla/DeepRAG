import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { updateChat } from "@/app/actions/chat"; // Assuming updateChat is in chat.ts
import { Loader2 } from 'lucide-react';

interface Chatbot {
  id: string;
  name: string;
  // Add other fields from getChatbots if they are to be displayed or edited
  // For example: description?: string; config?: Record<string, any>;
}

interface EditChatbotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatbot: Chatbot | null;
  onChatbotUpdated: () => void; // Callback to refresh the list in the parent
}

export function EditChatbotDialog({ 
  open, 
  onOpenChange, 
  chatbot, 
  onChatbotUpdated 
}: EditChatbotDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Add other state for other editable fields here, e.g.:
  // const [description, setDescription] = useState("");

  useEffect(() => {
    if (chatbot) {
      setName(chatbot.name);
      // Set other fields if chatbot has them, e.g.:
      // setDescription(chatbot.description || "");
    } else {
      // Reset fields if no chatbot is provided (e.g., dialog closed and reopened for a new edit)
      setName("");
      // setDescription("");
    }
  }, [chatbot]);

  const handleSubmit = async () => {
    if (!chatbot) return;
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "错误",
        description: "聊天助手名称不能为空。",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Construct the updates object based on what fields are editable
      const updates: { name: string; [key: string]: any } = { name: name.trim() };
      // if (description.trim() !== (chatbot.description || "")) {
      //   updates.description = description.trim();
      // }
      // Add other fields to 'updates' if they have changed

      const result = await updateChat(chatbot.id, updates);

      if (result.success) {
        toast({
          title: "成功",
          description: "聊天助手信息已更新。",
        });
        onChatbotUpdated(); // Call the callback to refresh the parent list
        onOpenChange(false); // Close the dialog
      } else {
        toast({
          variant: "destructive",
          title: "更新失败",
          description: result.message || "更新聊天助手时发生未知错误。",
        });
      }
    } catch (error: any) {
      console.error("Error updating chatbot:", error);
      toast({
        variant: "destructive",
        title: "发生错误",
        description: error.message || "更新过程中发生意外错误。",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If no chatbot is provided when the dialog is open, it's an invalid state or closing.
  // Optionally, you could show a loading/error state or simply not render the form.
  if (!chatbot && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>错误</DialogTitle>
            <DialogDescription>没有选择要编辑的聊天助手。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  
  if (!chatbot) return null; // Don't render if no chatbot and not open (prevents flash)

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        // Reset state if dialog is closed by clicking outside or X, before unmount
        // This helps if the parent `chatbot` prop doesn't change when it should for a reset
        if(chatbot) setName(chatbot.name || ""); 
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>编辑聊天助手: {chatbot.name}</DialogTitle>
          <DialogDescription>
            修改聊天助手的名称和其他配置信息。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              名称
            </Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="col-span-3" 
              disabled={isLoading}
            />
          </div>
          {/* 
          Add other input fields here, for example:
          <div className=\"grid grid-cols-4 items-center gap-4\">
            <Label htmlFor=\"description\" className=\"text-right\">
              描述
            </Label>
            <Input 
              id=\"description\" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              className=\"col-span-3\" 
              disabled={isLoading}
            />
          </div>
          */}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            保存更改
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 