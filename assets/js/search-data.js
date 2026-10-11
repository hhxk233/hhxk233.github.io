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
        },{id: "nav-publications",
          title: "publications",
          description: "Conference abstracts, preprints, and submitted manuscripts.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/publications/";
          },
        },{id: "nav-projects",
          title: "projects",
          description: "Research and personal projects.",
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
          description: "Current and completed coursework.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/courses/";
          },
        },{id: "dropdown-elm-game",
              title: "Elm Game",
              description: "",
              section: "Dropdown",
              handler: () => {
                window.location.href = "/elm_game/";
              },
            },{id: "dropdown-break-the-bricks",
              title: "Break the Bricks",
              description: "",
              section: "Dropdown",
              handler: () => {
                window.location.href = "/block_game/";
              },
            },{id: "dropdown-n2-small-structure",
              title: "N2 Small Structure",
              description: "",
              section: "Dropdown",
              handler: () => {
                window.location.href = "/n2_small_structure/";
              },
            },{id: "dropdown-portfolio-overview",
              title: "Portfolio Overview",
              description: "",
              section: "Dropdown",
              handler: () => {
                window.location.href = "/portfolio/";
              },
            },{id: "dropdown-blog",
              title: "blog",
              description: "",
              section: "Dropdown",
              handler: () => {
                window.location.href = "/blog/";
              },
            },{id: "post-some-notes-on-umich-physics-courses",
        
          title: "Some Notes on UMich Physics Courses",
        
        description: "Personal impressions of several physics courses I have taken at Michigan.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2026/umich-physics-course-notes/";
          
        },
      },{id: "news-i-will-join-the-applied-physics-department-at-rice-university-for-my-phd-in-fall-2026",
          title: 'I will join the Applied Physics Department at Rice University for my PhD...',
          description: "",
          section: "News",},{id: "projects-a-common-biological-dose-scale-for-sbrt-and-sirt",
          title: 'A Common Biological Dose Scale for SBRT and SIRT',
          description: "Imaging-derived liver response and biological dose modeling; conference abstract at ASTRO 2026.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/bed-sbrt-sirt/";
            },},{id: "projects-coupled-flow-matching-cpfm",
          title: 'Coupled Flow Matching (CPFM)',
          description: "Controllable dimensionality reduction with generalized Gromov–Wasserstein OT and Dual Conditional Flow Matching (DCFM) for bidirectional sampling p(y|x) and p(x|y).",
          section: "Projects",handler: () => {
              window.location.href = "/projects/coupled-flow-matching/";
            },},{id: "projects-curie-automate-rigorous-scientific-experimentation",
          title: 'Curie — Automate Rigorous Scientific Experimentation',
          description: "Contributions to a LangGraph-based multi-agent system for rigorous experiment loops with plan-scoped memory.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/curie/";
            },},{id: "projects-elm-game-seasonal-memoir",
          title: 'Elm Game — Seasonal Memoir',
          description: "A comforting pixel-art puzzle platformer about memory, seasons, and a loyal companion.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/elm-game/";
            },},{id: "projects-email-digest-bot",
          title: 'Email Digest Bot',
          description: "A personal email digest tool powered by Claude that summarizes emails from multiple accounts.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/email_digest_bot/";
            },},{id: "projects-epidemic-dynamics-as-phase-transitions",
          title: 'Epidemic Dynamics as Phase Transitions',
          description: "Epidemic evolution and phase-transition analogies studied with cellular automata and ODE models at SJTU.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/epidemic-fluid-analogies/";
            },},{id: "projects-loss-induced-synthetic-magnetic-field",
          title: 'Loss-Induced Synthetic Magnetic Field',
          description: "Rotationally asymmetric Si ring–resonator arrays engineered for non-Hermitian skin localization via controllable loss.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/loss-induced-synthetic-magnetic-field/";
            },},{id: "projects-mmwave-respiration-amp-voice-sensing",
          title: 'mmWave Respiration &amp;amp; Voice Sensing',
          description: "End-to-end 77-GHz FMCW pipeline for breathing/heartbeat from phase, with YOLOv8 camera guidance, real-time GUI, and hardware rig.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/mmwave-voice-vital-ml/";
            },},{id: "projects-non-hermitian-exciton-polariton-transport",
          title: 'Non-Hermitian Exciton–Polariton Transport',
          description: "3D-FDTD nanobeam–grating design, parameter sweeps, and a loss-engineered resonator platform toward PT-symmetry breaking.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/non-hermitian-exciton-polariton-transport/";
            },},{id: "projects-pt-symmetric-wireless-power-transfer",
          title: 'PT-Symmetric Wireless Power Transfer',
          description: "Chip-scale WPT architecture using coupled-oscillator phase control (Kuramoto/Adler) and PT-symmetric coupling to maximize transfer efficiency and robustness.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/pt-symmetric-wpt/";
            },},{id: "projects-remasker-cox",
          title: 'ReMasker-Cox',
          description: "Survival-guided masked autoencoder that couples imputation with a CoxPH risk signal for clinical tabular data.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/remasker-cox/";
            },},{id: "projects-wearable-safety-inspection-with-multimodal-llms",
          title: 'Wearable Safety Inspection with Multimodal LLMs',
          description: "SJTU team capstone combining Rokid AR glasses and compact vision-language models for industrial safety inspection, sponsored by Prof. Yifei Zhu.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/wearable-safety-inspection/";
            },},{
        id: 'social-email',
        title: 'email',
        section: 'Socials',
        handler: () => {
          window.open("mailto:%79%77%32%38%31@%72%69%63%65.%65%64%75", "_blank");
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
