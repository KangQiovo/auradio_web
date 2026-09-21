import { useId, useState } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { useQuietMotion } from '../lib/preferences';
import Icon from './Icon';
const themes = [
  { id: 'miuix', name: 'MIUIX', subtitle: '清晰，顺手。', text: '偏好更明快的层级、柔和的轮廓？从熟悉的秩序开始。' },
  { id: 'liquid', name: 'Liquid', subtitle: '轻盈，有层次。', text: '用通透的界面质感，让内容与操作之间多一点呼吸。' },
  { id: 'material', name: 'Material 3', subtitle: '有个性，也有章法。', text: '鲜明的控件与明确的反馈，给日常操作一个稳定的节奏。' },
];
export default function ThemeStudio() {
  const [selected, setSelected] = useState(0);
  const [tab, setTab] = useState('歌曲');
  const [favorite, setFavorite] = useState(false);
  const quiet = useQuietMotion();
  const id = useId();
  const theme = themes[selected];
  return <MotionConfig reducedMotion={quiet ? 'always' : 'never'}>
    <div className="theme-studio" data-theme={theme.id}>
      <div className="theme-selector">
        <div className="theme-tabs" role="tablist" aria-label="主题风格" aria-orientation="vertical">{themes.map((item, i) => <button id={`${id}-tab-${i}`} aria-controls={`${id}-preview`} role="tab" aria-selected={selected === i} tabIndex={selected === i ? 0 : -1} key={item.id} onClick={() => setSelected(i)} onKeyDown={event => { if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (selected + (['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : 2)) % 3; setSelected(next); document.getElementById(`${id}-tab-${next}`)?.focus(); } }}><span className="mono">0{i + 1}</span><strong>{item.name}</strong><Icon name="arrow" /></button>)}</div>
        <AnimatePresence mode="wait" initial={false}><motion.div key={theme.id} className="theme-description" initial={{ opacity: 0, y: quiet ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .18 }}><h3>{theme.subtitle}</h3><p>{theme.text}</p></motion.div></AnimatePresence>
        <p className="small-note">三种主题已出现在 Android 开发预览中。<br />右侧为官网独立制作的交互示意，不是应用截图。</p>
      </div>
      <div id={`${id}-preview`} className="theme-preview" role="tabpanel" aria-labelledby={`${id}-tab-${selected}`}>
        <span className="preview-caption mono">INTERFACE STUDY / {theme.name}</span>
        <motion.div className="preview-window" layout transition={{ duration: quiet ? 0 : .35 }}>
          <div className="preview-window-head"><span>Auradio</span><span className="preview-dots" aria-hidden="true">•••</span></div>
          <div className="preview-content">
            <div className="cover-study" aria-hidden="true"><div className="cover-disc" /><span>A LITTLE<br />ROOM.</span><small>WEB STUDY — 01</small></div>
            <div className="preview-library"><span className="mono">你的音乐</span><h3>在熟悉的旋律里。</h3><div className="library-tabs" aria-label="曲库视图">{['歌曲', '专辑', '艺术家'].map(name => <button aria-pressed={tab === name} key={name} onClick={() => setTab(name)}>{name}</button>)}</div>
              <AnimatePresence mode="wait" initial={false}><motion.div key={tab} className="study-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .12 }}>
                {(tab === '歌曲' ? ['A little room', 'Between the notes', 'Slow morning'] : tab === '专辑' ? ['Room studies', 'Quiet collection'] : ['Auradio Web Studio']).map((name, i) => <div className="study-row" key={name}><span className="mono">0{i + 1}</span><span>{name}<small>{tab === '艺术家' ? '原创网页示例' : '示意内容 · 非在线曲库'}</small></span><span className="study-dot" /></div>)}
              </motion.div></AnimatePresence>
            </div>
          </div>
          <div className="preview-bottom"><div><strong>A little room</strong><span>界面示意，不在这里播放</span></div><button className="favorite-button" aria-label={favorite ? '取消收藏示例' : '收藏示例'} aria-pressed={favorite} onClick={() => setFavorite(!favorite)}>{favorite ? <Icon name="check" /> : <span aria-hidden="true">+</span>}</button></div>
        </motion.div>
      </div>
    </div>
  </MotionConfig>;
}
