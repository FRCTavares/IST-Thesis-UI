# Migration Provenance

## Repository extraction

This repository was extracted from the browser-facing `live-ui/` tree of
`FRCTavares/IST-Thesis-Code` as part of Issue #55.

The extraction intentionally moves frontend presentation ownership only.

The following remain authoritative in `IST-Thesis-Code`:

- ROS 2 runtime;
- camera and perception;
- tracker;
- TIM-MARS;
- selected-person target authority;
- dashboard HTTP/WebSocket backend;
- `web_video_server`;
- controller and MAVROS integration;
- models and bags;
- scientific evaluation and experiment tooling;
- physical-reference data;
- annotation backend/tooling.

The browser remains an operator interface and command transport. It is not the
selected-person identity authority.

## Exact source

Source repository:

    FRCTavares/IST-Thesis-Code

Source execution branch:

    issue-55-ui-repository-extraction-20260901

Source Git commit:

    bd1f2cd508864665af2709a138839c1c338a3abf

Source `live-ui` tree:

    634754dd789c32ba1d75216855a9dd77e187774b

Source tracked frontend files:

    45

Extraction date:

    1 September 2026

Transfer mechanism:

    git archive <source-ref> live-ui | tar -x --strip-components=1

Only committed Git content was transferred. Local ignored/generated files such
as `node_modules/`, `dist/`, `*.tsbuildinfo`, and generated JavaScript or
declaration config outputs were excluded by construction.

Before this file and the new repository `.gitignore` were added, the imported
45-file destination manifest was compared with the source manifest and every
destination file was verified against its source Git blob hash.

Original frontend file history remains available in
`FRCTavares/IST-Thesis-Code`. No authoritative Thesis-Code history was
rewritten.

## Initial architecture

Dependency direction:

    IST-Thesis-UI
        |
        | HTTP + WebSocket + MJPEG
        v
    IST-Thesis-Code
        |
        | ROS 2
        v
    camera / perception / tracker / TIM-MARS / control

Cross-repository source imports are prohibited.

## Target-selection semantics

A numeric tracker ID selected in this UI is only the bootstrap mapping from the
operator-visible current track to the intended physical person.

For example, selecting track `3` means:

    initialize/select the physical person currently represented by tracker ID 3

It does not mean:

    permanently follow tracker ID 3

TIM-MARS remains the identity authority and may later associate the selected
physical person with another tracker ID after occlusion, re-entry, or tracker
identity change.

The UI must present the current TIM-MARS target/state rather than treating the
bootstrap tracker ID as permanent identity.

## Issue #55 field-interface direction

After this behavior-preserving source import is independently validated, the
frontend is approved to become an iPhone-first field interface emphasizing:

- live MJPEG video;
- numbered tracks;
- numeric target bootstrap selection;
- explicit select and clear-target actions;
- TIM-MARS state;
- current TIM-MARS target track ID;
- connection/backend status.

Desktop charts, large metric grids, logging workspaces, recording-history UI,
duplicate control surfaces, and ordinary model/tracker switching are not
required in the frozen field UI.

Backend safety and target-authority enforcement remain authoritative in
`IST-Thesis-Code`.
