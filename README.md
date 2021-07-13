# Salesforce WebViewer

## Cloning and deploying the repo
* run `git clone` or download the repo
* Download WebViewer (here)[https://www.pdftron.com/documentation/web/download]
* `cd` into the folder and run `npm run optimize` - select `y` for Deploy to Salesforce?
* Copy the `.zip` files into your `/staticresources/` folder - make sure the `.xml` files correspond to your `.zip`
* In VS Code, right click on the `force-app` folder and select `SFDX: Deploy Source to Org` / use (SFDX CLI)[https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_reference.meta/sfdx_cli_reference/cli_reference_force_source.htm] / or run your own deployment tool
* in your org, click `Setup > Edit Page` and drop the `pdftronFileMergeContainer` onto a Lightning page
