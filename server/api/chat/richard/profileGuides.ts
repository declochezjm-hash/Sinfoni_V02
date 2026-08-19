import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getProfileGuideMeta,
  resolveProfileDocId,
  type ProfileDocId,
} from '../../../../src/lib/ai/profileGuides.ts';

const PROFILES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../src/docs/profiles',
);

export interface ProfileGuidePayload {
  ok: true;
  profileId: ProfileDocId;
  title: string;
  shortLabel: string;
  markdown: string;
  sourceFile: string;
}

export function loadProfileGuideMarkdown(profileId: ProfileDocId): string {
  const filePath = join(PROFILES_DIR, `${profileId}.md`);
  return readFileSync(filePath, 'utf8');
}

export function fetchProfileGuide(options: {
  profileId?: string;
  role?: string;
  userRole?: string;
}): ProfileGuidePayload {
  const profileId = resolveProfileDocId(options);
  const meta = getProfileGuideMeta(profileId);
  const markdown = loadProfileGuideMarkdown(profileId);

  return {
    ok: true,
    profileId,
    title: meta.title,
    shortLabel: meta.shortLabel,
    markdown,
    sourceFile: `src/docs/profiles/${profileId}.md`,
  };
}
