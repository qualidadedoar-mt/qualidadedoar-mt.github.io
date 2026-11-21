// Entrada do portal: login (contas criadas pelo administrador), liberação de acesso
// em users/{uid} e leitura em tempo real do resumo publicado pelo coletor (portal/estado).
import { QAR } from './portal.js';
import { auth, db } from './firebase.js';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';

const MSG = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/user-disabled': 'Esta conta foi desativada.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  'auth/network-request-failed': 'Sem conexão com a internet.'
};
const erro = (e) => new Error(MSG[e.code] || 'Não foi possível concluir (' + (e.code || e.message) + ').');
const $ = (s) => document.querySelector(s);
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

if (location.protocol === 'file:') {
  QAR.local(); // aberto direto do disco: só demonstração, sem login
} else {
  iniciar();
}

function iniciar() {
  QAR.lock('loading');
  QAR.auth = {
    login: async (email, senha) => { try { await signInWithEmailAndPassword(auth, email, senha); } catch (e) { throw erro(e); } },
    reset: async (email) => { try { await sendPasswordResetEmail(auth, email); } catch (e) { if (e.code !== 'auth/user-not-found') throw erro(e); } },
    logout: () => signOut(auth)
  };
  let pararDados = null, pararEquipe = null;
  onAuthStateChanged(auth, async (u) => {
    if (pararDados) pararDados();
    if (pararEquipe) pararEquipe();
    pararDados = pararEquipe = null;
    $('#nav-equipe').hidden = true;
    if (!u) { QAR.lock('form'); return; }
    QAR.lock('loading');
    let perfil;
    try {
      const ref = doc(db, 'users', u.uid);
      const s = await getDoc(ref);
      if (s.exists()) perfil = s.data();
      else {
        perfil = { email: (u.email || '').toLowerCase(), status: 'pending', role: 'leitor', criado: serverTimestamp() };
        await setDoc(ref, perfil);
      }
    } catch (e) {
      QAR.lock('form', 'Erro ao verificar o acesso: ' + (e.code || e.message));
      return;
    }
    if (perfil.status !== 'active') {
      QAR.lock('denied', `A conta ${u.email} entrou, mas o acesso ainda não foi liberado pelo administrador.`);
      return;
    }
    pararDados = onSnapshot(doc(db, 'portal', 'estado'),
      (s) => { QAR.unlock(u.email); QAR.setData(s.exists() ? s.data() : null); },
      (e) => QAR.lock('denied', 'Sem permissão para ler os dados (' + e.code + ').'));
    if (perfil.role === 'admin') pararEquipe = equipe(u.uid);
  });
}

// Página "Equipe" (só admin): libera, bloqueia e promove contas.
function equipe(meuUid) {
  $('#nav-equipe').hidden = false;
  const tbl = $('#eq-tbl');
  const pill = (st) => st === 'active' ? '<span class="pill" style="background:var(--n1)">Ativa</span>'
    : st === 'blocked' ? '<span class="pill" style="background:var(--n4)">Bloqueada</span>'
    : '<span class="pill l2" style="background:var(--n2)">Pendente</span>';
  const parar = onSnapshot(collection(db, 'users'), (snap) => {
    const linhas = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0) || String(a.email).localeCompare(String(b.email)));
    tbl.innerHTML = `<thead><tr><th>E-mail</th><th>Situação</th><th>Papel</th><th></th></tr></thead><tbody>${linhas.map((l) => {
      const eu = l.id === meuUid;
      const b = (acao, txt) => `<button class="btn" type="button" data-uid="${esc(l.id)}" data-acao="${acao}">${txt}</button>`;
      const acoes = eu ? '<span class="small muted">você</span>' : [
        l.status !== 'active' ? b('ativar', 'Ativar') : b('bloquear', 'Bloquear'),
        l.role === 'admin' ? b('leitor', 'Tornar leitor') : b('admin', 'Tornar admin')
      ].join(' ');
      return `<tr><td>${esc(l.email)}</td><td>${pill(l.status)}</td><td>${l.role === 'admin' ? 'Administrador' : 'Leitor'}</td><td style="display:flex;gap:6px;flex-wrap:wrap">${acoes}</td></tr>`;
    }).join('')}</tbody>`;
    $('#eq-pend').textContent = linhas.filter((l) => l.status === 'pending').length || '';
  }, (e) => { tbl.innerHTML = `<tbody><tr><td>Erro ao listar: ${esc(e.code)}</td></tr></tbody>`; });
  tbl.onclick = async (ev) => {
    const bt = ev.target.closest('button[data-acao]');
    if (!bt) return;
    const mud = { ativar: { status: 'active' }, bloquear: { status: 'blocked' }, admin: { role: 'admin' }, leitor: { role: 'leitor' } }[bt.dataset.acao];
    bt.disabled = true;
    try { await updateDoc(doc(db, 'users', bt.dataset.uid), { ...mud, atualizado: serverTimestamp() }); }
    catch (e) { alert('Não foi possível alterar: ' + (e.code || e.message)); bt.disabled = false; }
  };
  return parar;
}
