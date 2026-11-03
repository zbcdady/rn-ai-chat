import { memo, useDeferredValue } from 'react';
import Markdown, { MarkdownIt, type ASTNode, type RenderRules } from 'react-native-markdown-display';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CopyButton } from './copy-button';
import { stableMarkdownChildren } from './stable-markdown-children';

const parser = new MarkdownIt({ html: false, linkify: false, typographer: false });
const CodeBlock = memo(function CodeBlock({ content, language }: { content: string; language: string }) {
  return <View style={styles.code}>
    <View style={styles.codeHeader}><Text style={styles.language}>{language || '代码'}</Text><CopyButton text={content} label="复制代码" dark /></View>
    <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator contentContainerStyle={styles.codeScroll}>
      <Text selectable style={styles.codeText}>{content.replace(/\n$/, '')}</Text>
    </ScrollView>
  </View>;
});
function code(node: ASTNode) {
  const language = (node as ASTNode & { sourceInfo?: string }).sourceInfo?.trim().split(/\s/)[0] ?? '';
  return <CodeBlock key={node.key} content={node.content} language={language} />;
}
const rules: RenderRules = {
  body: (_node, children, _parents, inheritedStyles) => <View key="body" style={inheritedStyles._VIEW_SAFE_body}>{stableMarkdownChildren(children)}</View>,
  textgroup: (node, children, _parent, inheritedStyles) => <Text key={node.key} selectable style={inheritedStyles.textgroup}>{children}</Text>,
  fence: code,
  code_block: code,
  table: (node, children, _parent, inheritedStyles) => <ScrollView key={node.key} horizontal nestedScrollEnabled style={styles.tableScroll}>
    <View style={inheritedStyles.table}>{children}</View>
  </ScrollView>,
  image: (node) => <Text key={node.key} style={styles.image}>[图片：{node.content || '外部图片'}]</Text>,
};
export const MarkdownMessage = memo(function MarkdownMessage({ content }: { content: string }) {
  // Keep typing/scrolling ahead of parsing a growing Markdown document.
  // The SDK snapshot and persistence still receive every chunk immediately.
  const renderedContent = useDeferredValue(content);
  return <Markdown markdownit={parser} rules={rules} style={markdownStyles}
    onLinkPress={(url) => /^https?:\/\//i.test(url)}>{renderedContent}</Markdown>;
});
const styles = StyleSheet.create({
  code: { backgroundColor: '#1D1F25', borderRadius: 12, marginVertical: 10, overflow: 'hidden', width: '100%' },
  codeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 14, paddingRight: 6, backgroundColor: '#282B32' },
  language: { color: '#CAD4E7', fontSize: 12, fontWeight: '500' },
  codeScroll: { padding: 14 },
  codeText: { color: '#E9EFFB', fontSize: 13, lineHeight: 22, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  tableScroll: { marginVertical: 8, maxWidth: '100%' },
  image: { color: '#748097', fontSize: 14 },
});
const markdownStyles = StyleSheet.create({
  body: { color: '#292B30', fontSize: 16, lineHeight: 27, width: '100%' },
  paragraph: { marginTop: 4, marginBottom: 12 },
  heading1: { fontSize: 24, lineHeight: 33, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  heading2: { fontSize: 21, lineHeight: 30, fontWeight: '700', marginTop: 14, marginBottom: 7 },
  heading3: { fontSize: 18, lineHeight: 27, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  bullet_list: { marginVertical: 6 }, ordered_list: { marginVertical: 6 },
  list_item: { marginBottom: 6 },
  code_inline: { backgroundColor: '#EDF1FB', color: '#3F55A3', fontSize: 14 },
  link: { color: '#415FD1' },
  blockquote: { backgroundColor: '#F4F6FB', borderLeftColor: '#BCC8E8', borderLeftWidth: 3, paddingHorizontal: 12, paddingVertical: 4 },
  hr: { backgroundColor: '#E4E9F2', height: 1, marginVertical: 14 },
  table: { borderColor: '#DCE3EF', borderWidth: 1, borderRadius: 6 },
  th: { minWidth: 100, maxWidth: 260, padding: 8, backgroundColor: '#F0F3FA' },
  td: { minWidth: 100, maxWidth: 260, padding: 8 },
});
