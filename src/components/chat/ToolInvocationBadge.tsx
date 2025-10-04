import { Loader2 } from "lucide-react";

interface ToolInvocationBadgeProps {
  toolName: string;
  args?: any;
  state?: string;
}

function formatToolMessage(toolName: string, args?: any): string {
  if (!args) {
    return toolName;
  }

  if (toolName === "str_replace_editor") {
    const { command, path } = args;

    switch (command) {
      case "create":
        return `Creating ${path}`;
      case "str_replace":
      case "insert":
        return `Editing ${path}`;
      case "view":
        return `Viewing ${path}`;
      default:
        return toolName;
    }
  }

  if (toolName === "file_manager") {
    const { command, path, new_path } = args;

    switch (command) {
      case "rename":
        return `Renaming ${path} → ${new_path}`;
      case "delete":
        return `Deleting ${path}`;
      default:
        return toolName;
    }
  }

  return toolName;
}

export function ToolInvocationBadge({ toolName, args, state }: ToolInvocationBadgeProps) {
  const message = formatToolMessage(toolName, args);
  const isCompleted = state === "result";

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isCompleted ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-neutral-700">{message}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{message}</span>
        </>
      )}
    </div>
  );
}
