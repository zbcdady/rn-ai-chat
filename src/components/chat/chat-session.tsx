import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { router } from 'expo-router';
import {
  Alert, FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable,
  StyleSheet, Text, TextInput, View,
  type NativeScrollEvent, type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { UIMessage } from '@tanstack/ai-react';
import type { Conversation } from '@/data/conversations';
import { useConversationChat } from '@/hooks/use-conversation-chat';
import { MessageBubble } from './message-bubble';
import { GenerationStatus } from './generation-status';
import { generationPhase, messageText, readableError } from './chat-model';
import { GlassIconButton, GlassSurface } from '@/components/ui/glass-icon-button';
import { ChatIcon } from '@/components/ui/chat-icon';

export default function ChatSession({ conversation }: { conversation: Conversation }) {
  const chat = useConversationChat(conversation);
  const { messages, input, setInput, isLoading, beginEdit, regenerate: regenerateRequest } = chat;
  const listRef = useRef<FlatList<UIMessage>>(null);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const followTail = useRef(true);
  const userScrolling = useRef(false);
  const frame = useRef<number | undefined>(undefined);
  const [showJump, setShowJump] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const currentMessages = useRef(messages);
  useEffect(() => { currentMessages.current = messages; }, [messages]);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); if (frame.current !== undefined) cancelAnimationFrame(frame.current); };
  }, []);

  const scrollToBottom = useCallback(() => {
    if (!followTail.current || frame.current !== undefined) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = undefined;
      if (followTail.current) listRef.current?.scrollToEnd({ animated: false });
    });
  }, []);
  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!userScrolling.current) return;
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const nearBottom = contentSize.height - contentOffset.y - layoutMeasurement.height < 72;
    followTail.current = nearBottom;
    setShowJump(!nearBottom);
  }
  const exploreHistory = useCallback(() => {
    followTail.current = false;
    setShowJump(true);
  }, []);
  function followLatest() { followTail.current = true; setShowJump(false); }
  const edit = useCallback((message: UIMessage) => {
    beginEdit(message);
    inputRef.current?.focus();
  }, [beginEdit]);
  const regenerate = useCallback((id: string) => {
    const history = currentMessages.current;
    const index = history.findIndex((message) => message.id === id);
    const hasLaterQuestion = history.slice(index + 1).some((message) => message.role === 'user');
    const run = () => {
      followTail.current = true;
      setShowJump(false);
      void regenerateRequest(id);
    };
    if (hasLaterQuestion) Alert.alert('从这条回复重新生成？', '这条回复和之后的对话会被新回复替换。', [
      { text: '取消', style: 'cancel' }, { text: '重新生成', onPress: run },
    ]);
    else run();
  }, [regenerateRequest]);
  async function leave() {
    Keyboard.dismiss();
    if (await chat.leave()) {
      if (router.canGoBack()) router.back(); else router.replace('/');
    }
  }
  const title = messageText(messages.find((m) => m.role === 'user') ?? { id: '', role: 'user', parts: [] }).trim().slice(0, 28) || '新对话';
  const failure = !isLoading && (chat.error || chat.localError || chat.ending === 'error');
  const interrupted = !isLoading && !failure && (chat.ending === 'stopped' || chat.ending === 'interrupted');
  const lastUserIndex = messages.findLastIndex((message) => message.role === 'user');
  const lastAssistant = messages.slice(lastUserIndex + 1).findLast((message) => message.role === 'assistant')?.id;

  return <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <GlassIconButton icon="back" label="返回会话列表" onPress={() => void leave()} />
        <View style={styles.heading}><Text numberOfLines={1} style={styles.title}>{title}</Text><View style={styles.modelRow}><View style={styles.modelDot} /><Text style={styles.model}>DeepSeek</Text></View></View>
        {keyboardVisible ? <GlassIconButton icon="keyboard" label="收起键盘" onPress={Keyboard.dismiss} /> : <View style={styles.headerSpacer} />}
      </View>
      <View style={styles.listArea}>
        <FlatList
          ref={listRef} data={messages} keyExtractor={(message) => message.id}
          renderItem={({ item }) => <MessageBubble message={item} generating={isLoading && item.id === lastAssistant}
            busy={isLoading} onEdit={edit} onRegenerate={regenerate} onExplore={exploreHistory} />}
          style={styles.list} contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          onContentSizeChange={scrollToBottom} onLayout={scrollToBottom}
          onScroll={onScroll} onScrollBeginDrag={() => { userScrolling.current = true; }}
          onScrollEndDrag={(event) => { onScroll(event); userScrolling.current = false; }}
          onMomentumScrollBegin={() => { userScrolling.current = true; }}
          onMomentumScrollEnd={(event) => { onScroll(event); userScrolling.current = false; }}
          scrollEventThrottle={32} initialNumToRender={10} maxToRenderPerBatch={6}
          windowSize={7} removeClippedSubviews={false}
          ListEmptyComponent={<View style={styles.empty}><View style={styles.emptyMark}><ChatIcon name="sparkles" size={34} color="#4D6BFE" /></View><Text style={styles.emptyTitle}>有什么想一起探索？</Text><Text style={styles.emptyHint}>从一个问题，开始新的思考。</Text></View>}
          ListFooterComponent={isLoading ? <GenerationStatus phase={generationPhase(messages)} /> : undefined}
        />
        {showJump ? <GlassIconButton icon="down" label="回到最新消息" style={styles.jump} onPress={() => { followLatest(); listRef.current?.scrollToEnd({ animated: true }); }} /> : null}
      </View>
      <View style={[styles.bottom, { paddingBottom: keyboardVisible ? 10 : Math.max(insets.bottom, 12) }]}>
        {chat.storageError ? <Pressable onPress={() => void chat.retrySave()}><Text accessibilityRole="alert" style={styles.error}>{chat.storageError} 点击重试保存</Text></Pressable> : null}
        {failure ? <View style={styles.notice}>
          <Text accessibilityRole="alert" style={styles.error}>{chat.localError || readableError(chat.error)}</Text>
          <GlassIconButton icon="retry" label="重试上次请求" onPress={() => { followLatest(); void chat.regenerate(); }} tone="subtle" iconSize={18} />
        </View> : null}
        {interrupted ? <View style={styles.notice}>
          <Text style={styles.noticeText}>{chat.ending === 'stopped' ? '已停止，已收到的内容会保留' : '上次回答已中断，聊天记录已保留'}</Text>
          <GlassIconButton icon="retry" label="重新生成中断的回复" onPress={() => { followLatest(); void chat.regenerate(); }} tone="subtle" iconSize={18} />
        </View> : null}
        {chat.editingId ? <View style={styles.editing}>
          <View style={styles.editingText}><Text style={styles.editingTitle}>编辑问题</Text><Text style={styles.editingHint}>发送后将替换该问题及后续回复</Text></View>
          <GlassIconButton icon="close" label="取消编辑" onPress={chat.cancelEdit} tone="subtle" iconSize={18} />
        </View> : null}
        <GlassSurface style={[styles.composer, chat.editingId && styles.editingBorder]}>
          <TextInput ref={inputRef} accessibilityLabel="消息输入框" value={input} onChangeText={setInput}
            multiline maxLength={12000} placeholder={isLoading ? '可以先写下一个问题…' : '发消息，或继续追问…'}
            placeholderTextColor="#919BAD" style={styles.input} />
          <GlassIconButton icon={isLoading ? 'stop' : 'send'} iconSize={isLoading ? 17 : 22} size={48}
            label={isLoading ? '停止生成' : chat.editingId ? '保存并发送修改后的问题' : '发送消息'}
            disabled={!isLoading && !input.trim()} tone="primary"
            onPress={() => { if (isLoading) chat.stopGeneration(); else { followLatest(); void chat.send(); } }} />
        </GlassSurface>
        {!keyboardVisible ? <Text style={styles.disclaimer}>AI 的回答可能有误，请核实重要信息</Text> : null}
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  heading: { flex: 1, alignItems: 'center', gap: 3 }, title: { color: '#24262C', fontSize: 16, fontWeight: '600', letterSpacing: -0.3 },
  modelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, modelDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#4D6BFE' },
  model: { color: '#909AAD', fontSize: 11 }, headerSpacer: { width: 44 },
  listArea: { flex: 1 }, list: { flex: 1 },
  messages: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 48, maxWidth: 780, width: '100%', alignSelf: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingBottom: 60 },
  emptyMark: { width: 60, height: 60, borderRadius: 22, backgroundColor: '#F2F4FF', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emptyTitle: { color: '#24262C', fontSize: 23, fontWeight: '600' }, emptyHint: { color: '#8A96AA', fontSize: 14 },
  jump: { position: 'absolute', bottom: 12, alignSelf: 'center' },
  bottom: { paddingHorizontal: 14, paddingTop: 8, width: '100%', maxWidth: 800, alignSelf: 'center', backgroundColor: '#FFFFFF' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 8, marginBottom: 6 },
  noticeText: { flex: 1, color: '#8A96A8', fontSize: 12, lineHeight: 18 },
  error: { flex: 1, color: '#AD5864', fontSize: 12, lineHeight: 18, paddingVertical: 6 },
  editing: { padding: 10, backgroundColor: '#F2F5FE', borderRadius: 12, flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }, editingText: { flex: 1, gap: 3 }, editingTitle: { fontSize: 13, color: '#4D66C6', fontWeight: '600' }, editingHint: { fontSize: 11, color: '#8A96AA' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', borderRadius: 29, padding: 6, paddingLeft: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E6E9', gap: 8 },
  editingBorder: { borderColor: '#BDCAF0' },
  input: { flex: 1, minHeight: 40, maxHeight: 144, paddingVertical: 9, paddingRight: 2, fontSize: 16, lineHeight: 23, color: '#24262C', textAlignVertical: 'top' },
  disclaimer: { textAlign: 'center', color: '#A3ACBB', fontSize: 10, paddingTop: 8 },
});
