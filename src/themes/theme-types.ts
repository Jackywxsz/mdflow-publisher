export interface ThemeStyles {
  container: string;
  h1: string;
  h2: string;
  h3: string;
  h4?: string;
  h5?: string;
  h6?: string;
  p: string;
  strong: string;
  em: string;
  a: string;
  ul: string;
  ol: string;
  li: string;
  blockquote: string;
  code: string;
  pre: string;
  hr: string;
  img: string;
  table: string;
  th: string;
  td: string;
  tr: string;
  [key: string]: string | undefined;
}

export interface Theme {
  name: string;
  styles: ThemeStyles;
}

export type ThemeId = string;
