import { appVersionSelectors } from "Selectors/exportImport";
import { editVersionSelectors } from "Selectors/version";
import {
    editVersionText,
    releasedVersionText,
    deleteVersionText,
} from "Texts/version";
import { createNewVersion } from "Support/utils/exportImport";
import {
    navigateToCreateNewVersionModal,
    verifyElementsOfCreateNewVersionModal,
    navigateToEditVersionModal,
    editVersionAndVerify,
    deleteVersionAndVerify,
    releasedVersionAndVerify,
    verifyDuplicateVersion,
    verifyVersionAfterPreview,
} from "Support/utils/version";
import { fake } from "Fixtures/fake";
import { commonSelectors, commonWidgetSelector } from "Selectors/common";
import { commonText } from "Texts/common";
import {
    verifyModal,
    closeModal,
    navigateToAppEditor,
} from "Support/utils/common";
import { commonEeSelectors, multiEnvSelector } from "Selectors/eeCommon";
import { promoteApp, releaseApp } from "Support/utils/multiEnv";

import {
    verifyComponent,
    deleteComponentAndVerify,
} from "Support/utils/basicComponents";

describe("App Version Functionality", () => {
    var data = {};
    data.appName = `${fake.companyName}-App`;
    let currentVersion = "";
    let newVersion = [];
    let versionFrom = "";
    beforeEach(() => {
        cy.apiLogin();
        cy.skipWalkthrough();
    });

    it("Verify the elements of the version module", () => {
        cy.apiCreateApp(data.appName);
        cy.openApp();
        cy.waitForAppLoad();
        cy.dragAndDropWidget("Text", 50, 50);
        cy.get(appVersionSelectors.appVersionLabel).should("be.visible");
        navigateToCreateNewVersionModal((currentVersion = "v1"));
        cy.wait(500);
        verifyElementsOfCreateNewVersionModal((currentVersion = ["v1"]));

        navigateToEditVersionModal((currentVersion = "v1"));
        verifyModal(
            editVersionText.editVersionTitle,
            editVersionText.saveButton,
            editVersionSelectors.versionNameInputField
        );
        closeModal(commonText.closeButton);
    });

    it("Verify all functionality for the app version", () => {
        data.appName = `${fake.companyName}-App`;
        data.slug = data.appName.toLowerCase().replace(/\s+/g, "-");

        cy.apiCreateApp(data.appName);
        cy.openApp();
        cy.waitForAppLoad();

        cy.dragAndDropWidget("Toggle Switch", 50, 50);
        verifyComponent("toggleswitch1");

        navigateToCreateNewVersionModal((currentVersion = "v1"));
        createNewVersion((newVersion = ["v2"]), (versionFrom = "v1"));
        verifyComponent("toggleswitch1");
        cy.wait(2000);
        deleteComponentAndVerify("toggleswitch1");

        cy.dragAndDropWidget("button");
        verifyComponent("button1");
        navigateToCreateNewVersionModal((currentVersion = "v2"));
        createNewVersion((newVersion = ["v3"]), (versionFrom = "v2"));
        verifyComponent("button1");

        promoteApp();

        verifyComponent("button1");
        cy.wait(1000);
        cy.get('[data-cy="list-current-env-name"]').click();
        cy.get(multiEnvSelector.envNameList).eq(0).click();

        navigateToCreateNewVersionModal((currentVersion = "v3"));
        createNewVersion((newVersion = ["v4"]), (versionFrom = "v1"));
        verifyComponent("toggleswitch1");

        editVersionAndVerify(
            (currentVersion = "v4"),
            (newVersion = ["v5"]),
            editVersionText.VersionNameUpdatedToastMessage
        );
        navigateToCreateNewVersionModal((currentVersion = "v5"));
        verifyDuplicateVersion((newVersion = ["v5"]), (versionFrom = "v5"));
        closeModal(commonText.closeButton);
        deleteVersionAndVerify(
            (currentVersion = "v5"),
            deleteVersionText.deleteToastMessage((currentVersion = "v5"))
        );
        cy.waitForAppLoad();
        cy.wait(1500);
        cy.get('[data-cy="list-current-env-name"]').click();
        cy.get(multiEnvSelector.envNameList).eq(1).click();

        promoteApp();

        releasedVersionAndVerify((currentVersion = "v3"));

        cy.get(commonWidgetSelector.shareAppButton).click();
        cy.clearAndType(commonWidgetSelector.appNameSlugInput, `${data.slug}`);
        cy.wait(2000);
        cy.get(commonWidgetSelector.modalCloseButton).click();
        cy.wait(2000);
        cy.visit(`/applications/${data.slug}`);

        verifyComponent("button1");
        cy.go("back");
        cy.wait(3000);
        cy.get('[data-cy="list-current-env-name"]').click();
        cy.get(multiEnvSelector.envNameList).eq(0).click();
        navigateToCreateNewVersionModal((currentVersion = "v3"));
        createNewVersion((newVersion = ["v6"]), (versionFrom = "v3"));

        verifyVersionAfterPreview((currentVersion = "v6"));
        cy.go("back");
    });
});