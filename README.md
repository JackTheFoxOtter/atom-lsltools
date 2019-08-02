# LSL-Tools for Atom

Integrates functionality to make working with the 'Linden Scripting Language' (LSL) for Second Life more comfortable.

## Core Features:
+ Directly integrates support for external script compilers like [Sei-Lisa's LSL compiler](https://github.com/Sei-Lisa/LSL-compiler)
+ Includes preprocessing system that can be used to extend the base language (unfinished)
+ 'Instant export' feature which allows to instantly(\*) export a script into a script opened inside the game

<i>
(*) Instant export works by integrating into Firestorm's 'open in external editor' feature which works by creating a temporary file on the PC for an external editor to access. Has not been tested with other viewers, and doesn't work flawlessly. Can only export to in-game opened scripts if the 'open with external editor' button has been clicked, and is only accessible until the script is closed again.
</i>

## Disclaimer:
I'm developing this extension primarily for personal use since I am interested in the LSL language lately, however disliked most of the already existing development solutions. I decided to make this project open source both to make myself more familiar with GitHub but also to not close the project off to other potentially interested people. If you have ideas on how to improve this extensions, feel free to leave feedback!
