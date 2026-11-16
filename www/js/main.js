/* ============================================================
 * 单机传奇 —— 入口与界面绑定 (main.js)
 * ============================================================ */
(function () {
  'use strict';
  const game = new window.Game();
  window.game = game;

  let selectedClass = 'warrior';

  // 职业选择
  document.querySelectorAll('.class-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedClass = card.dataset.class;
    });
  });
  // 默认选中战士
  const firstCard = document.querySelector('.class-card[data-class="warrior"]');
  if (firstCard) firstCard.classList.add('selected');

  // 有存档则显示继续按钮
  if (game.hasSave()) {
    document.getElementById('continue-btn').style.display = 'inline-block';
  }

  function enterGame(isContinue) {
    document.getElementById('start-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    if (isContinue) {
      if (!game.load()) game.newGame(selectedClass, document.getElementById('player-name').value.trim());
    } else {
      game.newGame(selectedClass, document.getElementById('player-name').value.trim());
    }
    game._resize();
  }

  document.getElementById('start-btn').addEventListener('click', () => enterGame(false));
  document.getElementById('new-game-btn').addEventListener('click', () => enterGame(false));
  document.getElementById('continue-btn').addEventListener('click', () => enterGame(true));

  // 顶部按钮 -> 面板
  document.querySelectorAll('.top-buttons button').forEach(btn => {
    btn.addEventListener('click', () => game.openPanel(btn.dataset.panel));
  });
  // 关闭面板
  document.getElementById('panel-overlay').addEventListener('click', e => {
    if (e.target.id === 'panel-overlay') game.closePanels();
  });
  document.querySelectorAll('.panel-close').forEach(btn => {
    btn.addEventListener('click', () => game.closePanels());
  });
  // 对话框关闭
  document.getElementById('dialog-close').addEventListener('click', () => game.closeDialog());

  // 系统按钮
  document.getElementById('btn-save').addEventListener('click', () => {
    game.save(); game.toast('游戏已保存');
  });
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('确定要重新开始吗？当前进度将丢失。')) {
      localStorage.removeItem('danji-chuanqi-save');
      location.reload();
    }
  });
})();
