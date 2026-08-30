/**
 * Didacticiel contextuel.
 *
 * Plutôt qu'un mur de règles avant la partie, on désigne les éléments un par un
 * sur le plateau réel : un projecteur découpe la zone concernée dans un voile
 * sombre, et une bulle explique le geste attendu. Le joueur voit la chose dont
 * on parle, à sa place, dans l'état où elle sera en jeu.
 */
import { ICONES } from './icones';

export interface Etape {
  /** Élément à mettre en lumière ; si absent, la bulle est centrée. */
  cible?: string;
  titre: string;
  texte: string;
}

const CLE_VU = 'invento.didacticiel.v1';

export function didacticielDejaVu(): boolean {
  try {
    return localStorage.getItem(CLE_VU) === '1';
  } catch {
    return true; // sans stockage, on n'insiste pas à chaque partie
  }
}

function marquerVu(): void {
  try {
    localStorage.setItem(CLE_VU, '1');
  } catch {
    /* sans importance */
  }
}

/** Les étapes du premier combat, dans l'ordre où l'on en a besoin. */
export const ETAPES_COMBAT: Etape[] = [
  {
    cible: '.main',
    titre: 'Votre main',
    texte: "Touchez une carte pour la choisir. Sa gemme de coût passe au rouge quand vous n'avez pas assez de cristaux.",
  },
  {
    cible: '.tiroir',
    titre: 'Le bandeau',
    texte: "Dès qu'une carte est choisie, ce bandeau affiche son texte complet et, en doré, le geste attendu de vous.",
  },
  {
    cible: '.lignes--mienne',
    titre: 'Vos trois lignes',
    texte: "Les emplacements libres s'allument en doré : touchez-en un pour invoquer la créature choisie.",
  },
  {
    cible: '.lignes--mienne',
    titre: 'Attaquer',
    texte: "Une créature prête porte une épée verte : touchez-la, puis touchez sa cible. Un sablier signale qu'elle vient d'arriver et ne peut pas encore frapper.",
  },
  {
    cible: '.lignes--adverse',
    titre: 'Choisir sa cible',
    texte: "Les cibles possibles affichent les dégâts que vous infligeriez, et la mention FATAL si le coup les tue. Une créature attaque celle qui lui fait face ; si la ligne d'en face est vide, elle frappe le joueur.",
  },
  {
    cible: '.lignes--mienne',
    titre: 'Faire évoluer',
    texte: "Une flèche dorée sur une créature signale qu'une évolution l'attend dans votre main. Choisissez cette carte, puis touchez la créature.",
  },
  {
    cible: '.tiroir',
    titre: 'Le pouvoir de terrain',
    texte: "Votre terrain offre un pouvoir activable une fois par tour, contre des cristaux. Il apparaît ici quand rien n'est sélectionné.",
  },
  {
    cible: '[data-fin-tour]',
    titre: 'Finir le tour',
    texte: "Quand vous avez tout joué, passez la main. Vos cristaux remonteront d'un cran au tour suivant.",
  },
];

/**
 * Déroule les étapes. Renvoie une promesse résolue à la fin ou à l'abandon.
 * L'appelant reste responsable de ne pas jouer pendant ce temps.
 */
export function lancerDidacticiel(etapes: Etape[], options: { marquer?: boolean } = {}): Promise<void> {
  return new Promise((resoudre) => {
    let index = 0;

    const voile = document.createElement('div');
    voile.className = 'didact';
    voile.innerHTML = `
      <div class="didact__projecteur" hidden></div>
      <div class="didact__bulle" role="dialog" aria-live="polite">
        <span class="didact__compteur"></span>
        <h3 class="didact__titre"></h3>
        <p class="didact__texte"></p>
        <div class="didact__actions">
          <button class="bouton bouton--fantome" data-passer>Passer</button>
          <button class="bouton bouton--primaire" data-suivant>Suivant</button>
        </div>
      </div>`;
    document.body.appendChild(voile);

    const projecteur = voile.querySelector<HTMLElement>('.didact__projecteur')!;
    const bulle = voile.querySelector<HTMLElement>('.didact__bulle')!;
    const titre = voile.querySelector<HTMLElement>('.didact__titre')!;
    const texte = voile.querySelector<HTMLElement>('.didact__texte')!;
    const compteur = voile.querySelector<HTMLElement>('.didact__compteur')!;
    const suivant = voile.querySelector<HTMLButtonElement>('[data-suivant]')!;

    function afficher(): void {
      const e = etapes[index];
      if (!e) return terminer();

      titre.textContent = e.titre;
      texte.textContent = e.texte;
      compteur.textContent = `${index + 1} / ${etapes.length}`;
      suivant.textContent = index === etapes.length - 1 ? 'Commencer' : 'Suivant';

      const cible = e.cible ? document.querySelector<HTMLElement>(e.cible) : null;
      if (!cible) {
        projecteur.hidden = true;
        bulle.style.top = '50%';
        bulle.style.transform = 'translateY(-50%)';
        return;
      }

      const r = cible.getBoundingClientRect();
      const marge = 8;
      projecteur.hidden = false;
      projecteur.style.left = `${r.left - marge}px`;
      projecteur.style.top = `${r.top - marge}px`;
      projecteur.style.width = `${r.width + marge * 2}px`;
      projecteur.style.height = `${r.height + marge * 2}px`;

      // La bulle se place du côté où il reste de la place.
      const dessous = r.bottom + 16;
      const placeDessous = window.innerHeight - dessous;
      bulle.style.transform = '';
      if (placeDessous > 210) {
        bulle.style.top = `${dessous}px`;
        bulle.style.bottom = 'auto';
      } else {
        bulle.style.top = 'auto';
        bulle.style.bottom = `${window.innerHeight - r.top + 16}px`;
      }
    }

    function terminer(): void {
      if (options.marquer !== false) marquerVu();
      voile.remove();
      window.removeEventListener('resize', afficher);
      resoudre();
    }

    voile.addEventListener('click', (ev) => {
      const t = ev.target as HTMLElement;
      if (t.closest('[data-passer]')) return terminer();
      if (t.closest('[data-suivant]') || t.closest('.didact__projecteur')) {
        index += 1;
        if (index >= etapes.length) return terminer();
        afficher();
      }
    });
    window.addEventListener('resize', afficher);
    afficher();
  });
}

/** Bouton d'aide permanent, à poser dans la barre d'actions du combat. */
export function boutonAide(): string {
  return `<button class="bouton bouton--fantome bouton--icone" data-aide aria-label="Revoir les commandes" title="Revoir les commandes">${ICONES.aide}</button>`;
}
