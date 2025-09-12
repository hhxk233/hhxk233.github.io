// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "about",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-blog",
          title: "blog",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/blog/";
          },
        },{id: "nav-projects",
          title: "projects",
          description: "A growing collection of your cool projects.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/projects/";
          },
        },{id: "nav-cv",
          title: "cv",
          description: "Curriculum Vitae of Yuheng Wang.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/cv/";
          },
        },{id: "nav-courses",
          title: "courses",
          description: "A curated list of courses I have taken.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/courses/";
          },
        },{id: "dropdown-game",
              title: "game",
              description: "",
              section: "Dropdown",
              handler: () => {
                window.location.href = "/elm_game/";
              },
            },{id: "dropdown-blog",
              title: "blog",
              description: "",
              section: "Dropdown",
              handler: () => {
                window.location.href = "/blog/";
              },
            },{id: "post-google-gemini-updates-flash-1-5-gemma-2-and-project-astra",
        
          title: 'Google Gemini updates: Flash 1.5, Gemma 2 and Project Astra <svg width="1.2rem" height="1.2rem" top=".5rem" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M17 13.5v6H5v-12h6m3-3h6v6m0-6-9 9" class="icon_svg-stroke" stroke="#999" stroke-width="1.5" fill="none" fill-rule="evenodd" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
        
        description: "We’re sharing updates across our Gemini family of models and a glimpse of Project Astra, our vision for the future of AI assistants.",
        section: "Posts",
        handler: () => {
          
            window.open("https://blog.google/technology/ai/google-gemini-update-flash-ai-assistant-io-2024/", "_blank");
          
        },
      },{id: "post-displaying-external-posts-on-your-al-folio-blog",
        
          title: 'Displaying External Posts on Your al-folio Blog <svg width="1.2rem" height="1.2rem" top=".5rem" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M17 13.5v6H5v-12h6m3-3h6v6m0-6-9 9" class="icon_svg-stroke" stroke="#999" stroke-width="1.5" fill="none" fill-rule="evenodd" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
        
        description: "",
        section: "Posts",
        handler: () => {
          
            window.open("https://medium.com/@al-folio/displaying-external-posts-on-your-al-folio-blog-b60a1d241a0a?source=rss-17feae71c3c4------2", "_blank");
          
        },
      },{id: "books-the-godfather",
          title: 'The Godfather',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/the_godfather/";
            },},{id: "news-a-simple-inline-announcement",
          title: 'A simple inline announcement.',
          description: "",
          section: "News",},{id: "news-a-long-announcement-with-details",
          title: 'A long announcement with details',
          description: "",
          section: "News",handler: () => {
              window.location.href = "/news/announcement_2/";
            },},{id: "news-a-simple-inline-announcement-with-markdown-emoji-sparkles-smile",
          title: 'A simple inline announcement with Markdown emoji! :sparkles: :smile:',
          description: "",
          section: "News",},{id: "projects-unified-bed-for-sbrt-vs-90y-sirt",
          title: 'Unified BED for SBRT vs 90Y SIRT',
          description: "Voxel-level liver function dose–response aligning SBRT EQD2 with protraction-aware SIRT BED.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/bed-sbrt-sirt/";
            },},{id: "projects-curie-automate-rigorous-scientific-experimentation",
          title: 'Curie — Automate Rigorous Scientific Experimentation',
          description: "LangGraph-based multi-agent system with plan-scoped memory for reliable experiment loops.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/curie/";
            },},{id: "projects-epidemics-as-fluid-phase-transitions",
          title: 'Epidemics as Fluid Phase Transitions',
          description: "Meta cellular automata in Python/MATLAB; second-order transitions linked to outbreak dynamics.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/epidemic-fluid-analogies/";
            },},{id: "projects-loss-induced-synthetic-magnetic-field",
          title: 'Loss-Induced Synthetic Magnetic Field',
          description: "Rotationally asymmetric Si ring–resonator arrays showing two-sided non-Hermitian skin effect.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/loss-induced-synthetic-magnetic-field/";
            },},{id: "projects-ml-for-mmwave-voice-amp-vital-signal-recognition",
          title: 'ML for mmWave Voice &amp;amp; Vital Signal Recognition',
          description: "VMD-HHT pipeline for denoising + reconstruction; embedded microcontroller signal I/O.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/mmwave-voice-vital-ml/";
            },},{id: "projects-non-hermitian-exciton-polariton-transport-beyond-lorentz-reciprocity",
          title: 'Non-Hermitian Exciton-Polariton Transport beyond Lorentz Reciprocity',
          description: "Nanobeam cavity + grating coupler; toward PT-symmetry breaking in hybridized edge modes.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/non-hermitian-exciton-polariton-transport/";
            },},{id: "projects-pt-symmetric-wireless-power-transfer-chip-scale",
          title: 'PT-Symmetric Wireless Power Transfer (Chip-Scale)',
          description: "Switch-mode WPT array using Kuramoto/Adler-guided coupling phase control.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/pt-symmetric-wpt/";
            },},{id: "projects-remasker-cox-survival-guided-masked-autoencoder",
          title: 'ReMasker-Cox — Survival-Guided Masked Autoencoder',
          description: "Joint imputation + CoxPH risk consistency for clinical tabular data with missingness.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/remasker-cox/";
            },},{
        id: 'social-email',
        title: 'email',
        section: 'Socials',
        handler: () => {
          window.open("mailto:%79%75%68%65%6E%67%77%61@%75%6D%69%63%68.%65%64%75", "_blank");
        },
      },{
        id: 'social-inspire',
        title: 'Inspire HEP',
        section: 'Socials',
        handler: () => {
          window.open("https://inspirehep.net/authors/", "_blank");
        },
      },{
        id: 'social-rss',
        title: 'RSS Feed',
        section: 'Socials',
        handler: () => {
          window.open("//feed.xml", "_blank");
        },
      },{
        id: 'social-scholar',
        title: 'Google Scholar',
        section: 'Socials',
        handler: () => {
          window.open("https://scholar.google.com/citations?user=", "_blank");
        },
      },{
        id: 'social-github',
        title: 'GitHub',
        section: 'Socials',
        handler: () => {
          window.open("https://github.com/hhxk233", "_blank");
        },
      },{
        id: 'social-custom_social',
        title: 'Custom_social',
        section: 'Socials',
        handler: () => {
          window.open("", "_blank");
        },
      },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
