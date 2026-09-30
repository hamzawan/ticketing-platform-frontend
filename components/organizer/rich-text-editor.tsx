"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Heading2, Heading3, Italic, List, ListOrdered, Quote, Underline as UnderlineIcon } from "lucide-react";

function ToolBtn({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`w-7 h-7 flex items-center justify-center rounded-md text-xs transition-colors ${
        active ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      }`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit, Underline, Placeholder.configure({ placeholder: placeholder ?? "Write something…" })],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { class: "bba-editor-inner" } },
    immediatelyRender: false,
  });

  if (!editor) return null;

  return (
    <div className="bba-editor border border-border rounded-xl overflow-hidden focus-within:border-primary transition-colors bg-background">
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-card flex-wrap">
        <ToolBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
          <Bold size={12} />
        </ToolBtn>
        <ToolBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
          <Italic size={12} />
        </ToolBtn>
        <ToolBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
          <UnderlineIcon size={12} />
        </ToolBtn>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolBtn
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
        >
          <Heading2 size={13} />
        </ToolBtn>
        <ToolBtn
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Heading 3"
        >
          <Heading3 size={13} />
        </ToolBtn>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
          <List size={13} />
        </ToolBtn>
        <ToolBtn
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Ordered list"
        >
          <ListOrdered size={13} />
        </ToolBtn>
        <ToolBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote">
          <Quote size={13} />
        </ToolBtn>
      </div>
      <EditorContent editor={editor} className="bba-editor" />
    </div>
  );
}
