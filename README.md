# atom-lsltools package

A short description of your package.

![A screenshot of your package](https://f.cloud.github.com/assets/69169/2290250/c35d867a-a017-11e3-86be-cd7c5bf3ff9b.gif)

Project folder structure:
    .out
        lsl
            Processed lsl-files go here.
            From here they can either get compiled or loaded into SL.
            Mirrors 'lsl-projects' folder structure

    lsl-library
        Place for various presets that can be included into projects by the preprocessor.
        Only 'snippets' which are treated as unfinished / non-compilable.

    lsl-projects
        Main working directory.
        Individual scripts can include code from lsl-library.
        Considered final and compilable.
