import svelte from 'rollup-plugin-svelte'
import sveltePreprocess from 'svelte-preprocess'

export default {
  plugins: [
    svelte({
      preprocess: sveltePreprocess()
    })
  ]
}