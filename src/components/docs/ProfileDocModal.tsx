import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen } from 'lucide-react';
import {
  getDefaultProfileDocId,
  getProfileDoc,
  isProfileDocId,
  PROFILE_DOCS,
  type ProfileDocId,
} from '../../docs/profiles';
import { useRole } from '../../hooks/useRole';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

interface ProfileDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProfileId?: ProfileDocId;
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-3 text-lg font-bold tracking-tight text-slate-900">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-6 border-b border-slate-200 pb-1 text-base font-semibold text-slate-800">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1.5 mt-4 text-sm font-semibold text-slate-800">{children}</h3>
  ),
  p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  hr: () => <hr className="my-5 border-slate-200" />,
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-slate-300 bg-white px-3 py-2 text-slate-700">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900"
    >
      {children}
    </a>
  ),
  code: ({ children, className }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return <code className={className}>{children}</code>;
    }
    return (
      <code className="rounded border border-slate-200 bg-white px-1 py-px text-[12px] text-slate-800">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-lg border border-slate-200 bg-white p-3 text-[12px] leading-relaxed text-slate-800">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full border-collapse text-left text-sm text-slate-800">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-800 text-white">{children}</thead>,
  tbody: ({ children }) => (
    <tbody className="bg-white [&>tr]:border-t [&>tr]:border-slate-200 [&>tr:nth-child(even)]:bg-slate-50/80">
      {children}
    </tbody>
  ),
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-xs font-semibold">{children}</th>
  ),
  td: ({ children }) => <td className="px-3 py-2 align-top text-sm">{children}</td>,
};

export default function ProfileDocModal({
  isOpen,
  onClose,
  initialProfileId,
}: ProfileDocModalProps) {
  const { user } = useRole();
  const [profileId, setProfileId] = useState<ProfileDocId>(() =>
    initialProfileId ?? getDefaultProfileDocId(user.role),
  );

  useEffect(() => {
    if (!isOpen) return;
    setProfileId(initialProfileId ?? getDefaultProfileDocId(user.role));
  }, [isOpen, initialProfileId, user.role]);

  const profile = getProfileDoc(profileId);

  const handleProfileChange = (value: string) => {
    if (isProfileDocId(value)) {
      setProfileId(value);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        overlayClassName="z-[2500]"
        className="z-[2501] flex h-[min(90vh,880px)] w-[calc(100%-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0"
        aria-describedby="profile-doc-description"
      >
        <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-4 pr-12">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
              <BookOpen size={16} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base">Guides & Fiches Métier</DialogTitle>
              <DialogDescription id="profile-doc-description" className="mt-1 text-xs">
                Rôles SINFONI, parcours dans l’application et automatisations proposées.
              </DialogDescription>
            </div>
          </div>

          <div className="mt-4 hidden md:block">
            <Tabs value={profileId} onValueChange={handleProfileChange}>
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-slate-100 p-1">
                {PROFILE_DOCS.map((doc) => (
                  <TabsTrigger key={doc.id} value={doc.id} className="text-xs">
                    {doc.shortLabel}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="mt-4 md:hidden">
            <Select value={profileId} onValueChange={handleProfileChange}>
              <SelectTrigger className="h-9 bg-white" aria-label="Choisir un profil">
                <SelectValue placeholder="Choisir un profil" />
              </SelectTrigger>
              <SelectContent className="z-[2600]">
                {PROFILE_DOCS.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.shortLabel} — {doc.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-5 py-5">
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-slate-500">
            {profile.subtitle}
          </p>
          <article className="text-sm text-slate-800">
            <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {profile.markdown}
            </Markdown>
          </article>
        </div>
      </DialogContent>
    </Dialog>
  );
}
