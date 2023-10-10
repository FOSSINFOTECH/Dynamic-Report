odoo.define("plant_accounting_report.DynamicTbMainAA", function (require) {
    "use strict";
    var ActionManager = require("web.ActionManager");
    var AbstractAction = require("web.AbstractAction");
    var Dialog = require("web.Dialog");
    var FavoriteMenu = require("web.FavoriteMenu");
    var web_client = require("web.web_client");
    var ajax = require("web.ajax");
    var core = require("web.core");
    var Widget = require("web.Widget");
    var field_utils = require("web.field_utils");
    var rpc = require("web.rpc");
    var time = require("web.time");
    var session = require("web.session");
    var utils = require("web.utils");
    var round_di = utils.round_decimals;
    var QWeb = core.qweb;
    var _t = core._t;
    var exports = {};
    var DynamicFrMainAA = AbstractAction.extend({
        template: "DynamicFrMainAA",
        events: {
            "click #filter_apply_button": "update_with_filter_aa",
            "click #pdf": "print_pdf",
            "click #xlsx": "print_xlsx",
            "click .view-source": "view_gl",
        },
        init: function (view, code) {
            this._super(view, code);
            this.wizard_id = code.context.wizard_id | null;
            this.account_report_id = code.context.account_report_id | null;
            this.session = session;
        },
        start: function () {
            var self = this;
            self.initial_render = true;
            if (!self.wizard_id) {
                self._rpc({
                    model: "ins.financial.report.aa",
                    method: "create",
                    context: {
                        report_name: this.account_report_id,
                    },
                    args: [
                        {
                            res_model: this.res_model,
                        },
                    ],
                }).then(function (record) {
                    self.wizard_id = record;
                    self.plot_data_pl_aa(self.initial_render);
                });
            } else {
                self.plot_data_pl_aa(self.initial_render);
            }
        },
        print_xlsx: function () {
            var self = this;
            self._rpc({
                model: "ins.financial.report.aa",
                method: "action_xlsx",
                args: [[self.wizard_id]],
            }).then(function (action) {
                action.context.active_ids = [self.wizard_id];
                return self.do_action(action);
            });
        },
        formatWithSign: function (amount, formatOptions, sign) {
            var currency_id = formatOptions.currency_id;
            currency_id = session.get_currency(currency_id);
            var without_sign = field_utils.format.monetary(
                Math.abs(amount),
                {},
                formatOptions
            );
            if (!amount) {
                return "-";
            }
            if (currency_id.position === "after") {
                return sign + "&nbsp;" + without_sign + "&nbsp;" + currency_id.symbol;
            }
            return currency_id.symbol + "&nbsp;" + sign + "&nbsp;" + without_sign;

            return without_sign;
        },
        plot_data_pl_aa: function (initial_render = true) {
            var self = this;
            var node = self.$(".py-data-container");
            var last;
            while ((last = node.lastChild)) node.removeChild(last);
            self._rpc({
                model: "ins.financial.report.aa",
                method: "get_report_values",
                args: [[self.wizard_id]],
            }).then(function (datas) {
                self.filter_data = datas.form;
                self.account_data = datas.report_lines;
                self.analytic_data = datas.analytic_data;
                self.dr_cr_bal_dict = datas.dr_cr_bal_dict;
                self.dr_cr_bal_dict_keys = datas.dr_cr_bal_dict_keys;

                var formatOptions = {
                    currency_id: datas.currency,
                    noSymbol: true,
                };
                self.initial_balance = self.formatWithSign(
                    datas.initial_balance,
                    formatOptions,
                    datas.initial_balance < 0 ? "-" : ""
                );
                self.current_balance = self.formatWithSign(
                    datas.current_balance,
                    formatOptions,
                    datas.current_balance < 0 ? "-" : ""
                );
                self.ending_balance = self.formatWithSign(
                    datas.ending_balance,
                    formatOptions,
                    datas.ending_balance < 0 ? "-" : ""
                );
                _.each(self.account_data, function (k, v) {
                    var formatOptions = {
                        currency_id: k.company_currency_id,
                        noSymbol: true,
                    };
                    const aa_bal = "-balance";
                    const aa_credit = "-credit";
                    const aa_debit = "-debit";
                    for (const aa_name in self.dr_cr_bal_dict) {
                        k[aa_name] = self.formatWithSign(
                            k[aa_name],
                            formatOptions,
                            k[aa_name] < 0 ? "-" : ""
                        );
                        console.log("/k[aa_name]", k[aa_name], aa_name, k);
                    }
                    k.balance_cmp = self.formatWithSign(
                        k.balance_cmp,
                        formatOptions,
                        k.balance < 0 ? "-" : ""
                    );
                });
                if (initial_render) {
                    self.$(".py-control-panel").html(
                        QWeb.render("FilterSectionFr", {
                            filter_data: self.filter_data,
                        })
                    );
                    self.$el.find("#date_from").datepicker({
                        dateFormat: "dd-mm-yy",
                    });
                    self.$el.find("#date_to").datepicker({
                        dateFormat: "dd-mm-yy",
                    });
                    self.$el.find("#date_from_cmp").datepicker({
                        dateFormat: "dd-mm-yy",
                    });
                    self.$el.find("#date_to_cmp").datepicker({
                        dateFormat: "dd-mm-yy",
                    });
                    self.$el.find(".date_filter-multiple").select2({
                        maximumSelectionSize: 1,
                        placeholder: "Select Date...",
                    });
                    self.$el.find(".journal-multiple").select2({
                        placeholder: "Select Journal...",
                    });
                    self.$el.find(".analytic-tag-multiple").select2({
                        placeholder: "Analytic Tags...",
                    });
                    self.$el.find(".analytic-multiple").select2({
                        placeholder: "Select Analytic...",
                    });
                    self.$el
                        .find(".extra-multiple")
                        .select2({
                            placeholder: "Extra Options...",
                        })
                        .val("debit_credit")
                        .trigger("change");
                }
                self.$(".py-data-container").html(
                    QWeb.render("DataSectionFrAA", {
                        account_data: self.account_data,
                        filter_data: self.filter_data,
                        analytic_data: self.analytic_data,
                        dr_cr_bal_dict: self.dr_cr_bal_dict,
                        dr_cr_bal_dict_keys: self.dr_cr_bal_dict_keys,
                    })
                );
                if (
                    parseFloat(datas.initial_balance) > 0 ||
                    parseFloat(datas.current_balance) > 0 ||
                    parseFloat(datas.ending_balance) > 0
                ) {
                    $(".py-data-container").append(
                        QWeb.render("SummarySectionFr", {
                            initial_balance: self.initial_balance,
                            current_balance: self.current_balance,
                            ending_balance: self.ending_balance,
                        })
                    );
                }
            });
        },
        view_gl: function (event) {
            event.preventDefault();
            var self = this;
            if (
                self.filter_data.date_from == false ||
                self.filter_data.date_to == false
            ) {
                alert("'Start Date' and 'End Date' are mandatory!");
                return true;
            }
            var domains = {
                account_ids: [$(event.currentTarget).data("account-id")],
                initial_balance: !(
                    self.filter_data.rtype == "CASH" ||
                    self.filter_data.rtype == "PANDL"
                ),
            };
            var context = {};
            if ($("#date_from").val()) {
                var dateObject = $("#date_from").datepicker("getDate");
                var dateString = $.datepicker.formatDate("yy-mm-dd", dateObject);
                domains.date_from = dateString;
            }
            if ($("#date_to").val()) {
                var dateObject = $("#date_to").datepicker("getDate");
                var dateString = $.datepicker.formatDate("yy-mm-dd", dateObject);
                domains.date_to = dateString;
            }
            if (!domains.date_from && !domains.date_to && !domains.date_range) {
                domains.date_from = self.filter_data.date_from;
                domains.date_to = self.filter_data.date_to;
            }
            var journal_ids = [];
            var journal_list = $(".journal-multiple").select2("data");
            for (var i = 0; i < journal_list.length; i++) {
                journal_ids.push(parseInt(journal_list[i].id));
            }
            domains.journal_ids = journal_ids;
            var analytic_ids = [];
            var analytic_list = $(".analytic-multiple").select2("data");
            for (var i = 0; i < analytic_list.length; i++) {
                analytic_ids.push(parseInt(analytic_list[i].id));
            }
            domains.analytic_ids = analytic_ids;
            var analytic_tag_ids = [];
            var analytic_tag_list = $(".analytic-tag-multiple").select2("data");
            for (var i = 0; i < analytic_tag_list.length; i++) {
                analytic_tag_ids.push(parseInt(analytic_tag_list[i].id));
            }
            domains.analytic_tag_ids = analytic_tag_ids;
            var fr_wizard_id = 0;
            self._rpc({
                model: "ins.general.ledger",
                method: "create",
                args: [{}],
            }).then(function (record) {
                fr_wizard_id = record;
                self._rpc({
                    model: "ins.general.ledger",
                    method: "write",
                    args: [fr_wizard_id, domains],
                }).then(function () {
                    var action = {
                        type: "ir.actions.client",
                        name: "GL View",
                        tag: "dynamic.gl",
                        nodestroy: true,
                        target: "new",
                        context: {
                            wizard_id: fr_wizard_id,
                            active_id: self.wizard_id,
                            active_model: "ins.trial.balance.aa.account",
                        },
                    };
                    return self.do_action(action);
                });
            });
        },
        update_with_filter_aa: function (event) {
            event.preventDefault();
            var self = this;
            self.initial_render = false;
            var output = {
                date_range: false,
                enable_filter: false,
                debit_credit: false,
            };
            if ($(".date_filter-multiple").select2("data").length === 1) {
                output.date_range = $(".date_filter-multiple").select2("data")[0].id;
            }
            if ($("#date_from").val()) {
                var dateObject = $("#date_from").datepicker("getDate");
                var dateString = $.datepicker.formatDate("yy-mm-dd", dateObject);
                output.date_from = dateString;
                output.date_to = false;
            }
            if ($("#date_to").val()) {
                var dateObject = $("#date_to").datepicker("getDate");
                var dateString = $.datepicker.formatDate("yy-mm-dd", dateObject);
                output.date_to = dateString;
                output.date_from = false;
            }
            if ($("#date_from").val() && $("#date_to").val()) {
                var dateObject = $("#date_from").datepicker("getDate");
                var dateString = $.datepicker.formatDate("yy-mm-dd", dateObject);
                output.date_from = dateString;
                var dateObject = $("#date_to").datepicker("getDate");
                var dateString = $.datepicker.formatDate("yy-mm-dd", dateObject);
                output.date_to = dateString;
            }
            if ($("#date_from_cmp").val()) {
                var dateObject = $("#date_from_cmp").datepicker("getDate");
                var dateString = $.datepicker.formatDate("yy-mm-dd", dateObject);
                output.date_from_cmp = dateString;
                output.enable_filter = true;
            }
            if ($("#date_to_cmp").val()) {
                var dateObject = $("#date_to_cmp").datepicker("getDate");
                var dateString = $.datepicker.formatDate("yy-mm-dd", dateObject);
                output.date_to_cmp = dateString;
                output.enable_filter = true;
            }
            var journal_ids = [];
            var journal_list = $(".journal-multiple").select2("data");
            for (var i = 0; i < journal_list.length; i++) {
                journal_ids.push(parseInt(journal_list[i].id));
            }
            output.journal_ids = journal_ids;
            var analytic_ids = [];
            var analytic_list = $(".analytic-multiple").select2("data");
            for (var i = 0; i < analytic_list.length; i++) {
                analytic_ids.push(parseInt(analytic_list[i].id));
            }
            output.analytic_ids = analytic_ids;
            var analytic_tag_ids = [];
            var analytic_tag_list = $(".analytic-tag-multiple").select2("data");
            for (var i = 0; i < analytic_tag_list.length; i++) {
                analytic_tag_ids.push(parseInt(analytic_tag_list[i].id));
            }
            output.analytic_tag_ids = analytic_tag_ids;
            var options_list = $(".extra-multiple").select2("data");
            for (var i = 0; i < options_list.length; i++) {
                if (options_list[i].id === "debit_credit") {
                    output.debit_credit = true;
                }
            }
            self._rpc({
                model: "ins.financial.report.aa",
                method: "write",
                args: [self.wizard_id, output],
            }).then(function (res) {
                self.plot_data_pl_aa(self.initial_render);
            });
        },
    });
    var DynamicTbMainAA = AbstractAction.extend({
        template: "DynamicTbMainAA",
        events: {
            "click #filter_apply_button": "update_with_filter_aa",
            // 'click #pdf': 'print_pdf',
            "click #xlsx": "print_xlsx",
            "click .view-source": "view_gl",
        },
        init: function (view, code) {
            this._super(view, code);
            this.wizard_id = code.context.wizard_id | null;
            this.session = session;
        },
        start: function () {
            var self = this;
            self.initial_render = true;
            if (!self.wizard_id) {
                self._rpc({
                    model: "ins.trial.balance.aa.account",
                    method: "create",
                    args: [
                        {
                            res_model: this.res_model,
                        },
                    ],
                }).then(function (record) {
                    self.wizard_id = record;
                    self.plot_data_aa(self.initial_render);
                });
            } else {
                self.plot_data_aa(self.initial_render);
            }
        },
        print_xlsx: function () {
            var self = this;

            self._rpc({
                model: "ins.trial.balance.aa.account",
                method: "action_xlsx",
                args: [[self.wizard_id]],
            }).then(function (action) {
                action.context.active_ids = [self.wizard_id];
                return self.do_action(action);
            });
        },
        formatWithSign: function (amount, formatOptions, sign) {
            var currency_id = formatOptions.currency_id;
            currency_id = session.get_currency(currency_id);
            var without_sign = field_utils.format.monetary(
                Math.abs(amount),
                {},
                formatOptions
            );
            if (!amount) {
                return "-";
            }
            if (currency_id.position === "after") {
                return sign + "&nbsp;" + without_sign + "&nbsp;" + currency_id.symbol;
            }
            return currency_id.symbol + "&nbsp;" + sign + "&nbsp;" + without_sign;

            return without_sign;
        },
        plot_data_aa: function (initial_render = true) {
            var self = this;
            var node = self.$(".py-data-container");
            var last;
            while ((last = node.lastChild)) node.removeChild(last);
            self._rpc({
                model: "ins.trial.balance.aa.account",
                method: "get_report_datas",
                args: [[self.wizard_id]],
            }).then(function (datas) {
                self.filter_data = datas[0];
                self.account_data = datas[1];
                self.retained = datas[2];
                self.subtotal = datas[3];
                self.aa_name_dict = datas[4];
                self.dr_cr_bal_dict = datas[5];
                self.total_dr_cr_bal_dict = datas[6];
                _.each(self.account_data, function (k, v) {
                    var formatOptions = {
                        currency_id: k.company_currency_id,
                        noSymbol: true,
                    };
                    k.debit = self.formatWithSign(
                        k.debit,
                        formatOptions,
                        k.debit < 0 ? "-" : ""
                    );
                    k.credit = self.formatWithSign(
                        k.credit,
                        formatOptions,
                        k.credit < 0 ? "-" : ""
                    );
                    k.balance = self.formatWithSign(
                        k.balance,
                        formatOptions,
                        k.balance < 0 ? "-" : ""
                    );
                    k.initial_debit = self.formatWithSign(
                        k.initial_debit,
                        formatOptions,
                        k.initial_debit < 0 ? "-" : ""
                    );
                    k.initial_credit = self.formatWithSign(
                        k.initial_credit,
                        formatOptions,
                        k.initial_credit < 0 ? "-" : ""
                    );
                    k.initial_balance = self.formatWithSign(
                        k.initial_balance,
                        formatOptions,
                        k.initial_balance < 0 ? "-" : ""
                    );
                    k.ending_debit = self.formatWithSign(
                        k.ending_debit,
                        formatOptions,
                        k.ending_debit < 0 ? "-" : ""
                    );
                    k.ending_credit = self.formatWithSign(
                        k.ending_credit,
                        formatOptions,
                        k.ending_credit < 0 ? "-" : ""
                    );
                    k.ending_balance = self.formatWithSign(
                        k.ending_balance,
                        formatOptions,
                        k.ending_balance < 0 ? "-" : ""
                    );

                    const aa_bal = "-balance";
                    const aa_credit = "-credit";
                    const aa_debit = "-debit";
                    for (const aa_name in self.dr_cr_bal_dict) {
                        k[aa_name] = self.formatWithSign(
                            k[aa_name],
                            formatOptions,
                            k[aa_name] < 0 ? "-" : ""
                        );
                    }
                });

                _.each(self.retained, function (k, v) {
                    var formatOptions = {
                        currency_id: k.company_currency_id,
                        noSymbol: true,
                    };
                    k.debit = self.formatWithSign(
                        k.debit,
                        formatOptions,
                        k.debit < 0 ? "-" : ""
                    );
                    k.credit = self.formatWithSign(
                        k.credit,
                        formatOptions,
                        k.credit < 0 ? "-" : ""
                    );
                    k.balance = self.formatWithSign(
                        k.balance,
                        formatOptions,
                        k.balance < 0 ? "-" : ""
                    );
                    k.initial_debit = self.formatWithSign(
                        k.initial_debit,
                        formatOptions,
                        k.initial_debit < 0 ? "-" : ""
                    );
                    k.initial_credit = self.formatWithSign(
                        k.initial_credit,
                        formatOptions,
                        k.initial_credit < 0 ? "-" : ""
                    );
                    k.initial_balance = self.formatWithSign(
                        k.initial_balance,
                        formatOptions,
                        k.initial_balance < 0 ? "-" : ""
                    );
                    k.ending_debit = self.formatWithSign(
                        k.ending_debit,
                        formatOptions,
                        k.ending_debit < 0 ? "-" : ""
                    );
                    k.ending_credit = self.formatWithSign(
                        k.ending_credit,
                        formatOptions,
                        k.ending_credit < 0 ? "-" : ""
                    );
                    k.ending_balance = self.formatWithSign(
                        k.ending_balance,
                        formatOptions,
                        k.ending_balance < 0 ? "-" : ""
                    );

                    for (const aa_name in self.total_dr_cr_bal_dict) {
                        k[aa_name] = self.formatWithSign(
                            k[aa_name],
                            formatOptions,
                            k[aa_name] < 0 ? "-" : ""
                        );
                    }
                });
                _.each(self.subtotal, function (k, v) {
                    var formatOptions = {
                        currency_id: k.company_currency_id,
                        noSymbol: true,
                    };
                    k.debit = self.formatWithSign(
                        k.debit,
                        formatOptions,
                        k.debit < 0 ? "-" : ""
                    );
                    k.credit = self.formatWithSign(
                        k.credit,
                        formatOptions,
                        k.credit < 0 ? "-" : ""
                    );
                    k.balance = self.formatWithSign(
                        k.balance,
                        formatOptions,
                        k.balance < 0 ? "-" : ""
                    );
                    k.initial_debit = self.formatWithSign(
                        k.initial_debit,
                        formatOptions,
                        k.initial_debit < 0 ? "-" : ""
                    );
                    k.initial_credit = self.formatWithSign(
                        k.initial_credit,
                        formatOptions,
                        k.initial_credit < 0 ? "-" : ""
                    );
                    k.initial_balance = self.formatWithSign(
                        k.initial_balance,
                        formatOptions,
                        k.initial_balance < 0 ? "-" : ""
                    );
                    k.ending_debit = self.formatWithSign(
                        k.ending_debit,
                        formatOptions,
                        k.ending_debit < 0 ? "-" : ""
                    );
                    k.ending_credit = self.formatWithSign(
                        k.ending_credit,
                        formatOptions,
                        k.ending_credit < 0 ? "-" : ""
                    );
                    k.ending_balance = self.formatWithSign(
                        k.ending_balance,
                        formatOptions,
                        k.ending_balance < 0 ? "-" : ""
                    );

                    for (const aa_name in self.total_dr_cr_bal_dict) {
                        k[aa_name] = self.formatWithSign(
                            k[aa_name],
                            formatOptions,
                            k[aa_name] < 0 ? "-" : ""
                        );
                    }
                });
                self.filter_data.date_from_tmp = self.filter_data.date_from;
                self.filter_data.date_to_tmp = self.filter_data.date_to;
                self.filter_data.date_from = field_utils.format.date(
                    field_utils.parse.date(
                        self.filter_data.date_from,
                        {},
                        {
                            isUTC: true,
                        }
                    )
                );
                self.filter_data.date_to = field_utils.format.date(
                    field_utils.parse.date(
                        self.filter_data.date_to,
                        {},
                        {
                            isUTC: true,
                        }
                    )
                );
                if (initial_render) {
                    self.$(".py-control-panel").html(
                        QWeb.render("FilterSectionTb", {
                            filter_data: self.filter_data,
                        })
                    );
                    self.$el.find("#date_from").datepicker({
                        dateFormat: "dd-mm-yy",
                    });
                    self.$el.find("#date_to").datepicker({
                        dateFormat: "dd-mm-yy",
                    });
                    self.$el.find(".date_filter-multiple").select2({
                        maximumSelectionSize: 1,
                        placeholder: "Select Date...",
                    });
                    self.$el
                        .find(".extra-multiple")
                        .select2({
                            placeholder: "Extra Options...",
                        })
                        .val("bal_not_zero")
                        .trigger("change");
                    self.$el.find(".analytic-multiple").select2({
                        placeholder: "Select Analytic...",
                    });
                    self.$el.find(".journal-multiple").select2({
                        placeholder: "Select Journal...",
                    });
                }
                self.$(".py-data-container").html(
                    QWeb.render("DataSectionTbAA", {
                        account_data: self.account_data,
                        name_data: self.aa_name_dict,
                        dr_cr_bal_dict: self.dr_cr_bal_dict,
                        total_dr_cr_bal_dict: self.total_dr_cr_bal_dict,
                        retained: self.retained,
                        subtotal: self.subtotal,
                        filter_data: self.filter_data,
                    })
                );
            });
        },
        view_gl: function (event) {
            event.preventDefault();
            var self = this;
            var domains = {
                account_ids: [$(event.currentTarget).data("account-id")],
                initial_balance: false,
            };
            var context = {};
            var journal_ids = [];
            var journal_list = $(".journal-multiple").select2("data");
            for (var i = 0; i < journal_list.length; i++) {
                journal_ids.push(parseInt(journal_list[i].id));
            }
            domains.journal_ids = journal_ids;
            var analytic_ids = [];
            var analytic_list = $(".analytic-multiple").select2("data");
            for (var i = 0; i < analytic_list.length; i++) {
                analytic_ids.push(parseInt(analytic_list[i].id));
            }
            domains.analytic_ids = analytic_ids;
            if ($(".date_filter-multiple").select2("data").length === 1) {
                domains.date_range = $(".date_filter-multiple").select2("data")[0].id;
            }
            if ($("#date_from").val()) {
                var dateObject = $("#date_from").datepicker("getDate");
                var dateString = $.datepicker.formatDate("yy-mm-dd", dateObject);
                domains.date_from = dateString;
            }
            if ($("#date_to").val()) {
                var dateObject = $("#date_to").datepicker("getDate");
                var dateString = $.datepicker.formatDate("yy-mm-dd", dateObject);
                domains.date_to = dateString;
            }
            if (!domains.date_from && !domains.date_to && !domains.date_range) {
                domains.date_from = self.filter_data.date_from_tmp;
                domains.date_to = self.filter_data.date_to_tmp;
            }
            var gl_wizard_id = 0;
            self._rpc({
                model: "ins.general.ledger",
                method: "create",
                args: [{}],
            }).then(function (record) {
                gl_wizard_id = record;
                self._rpc({
                    model: "ins.general.ledger",
                    method: "write",
                    args: [gl_wizard_id, domains],
                }).then(function () {
                    var action = {
                        type: "ir.actions.client",
                        name: "GL View",
                        tag: "dynamic.gl",
                        nodestroy: true,
                        target: "new",
                        context: {
                            wizard_id: gl_wizard_id,
                            active_id: self.wizard_id,
                            active_model: "ins.trial.balance.aa.account",
                        },
                    };
                    return self.do_action(action);
                });
            });
        },
        update_with_filter_aa: function (event) {
            event.preventDefault();
            var self = this;
            self.initial_render = false;
            var output = {
                date_range: false,
            };
            output.display_accounts = "all";
            output.show_hierarchy = false;
            var journal_ids = [];
            var journal_list = $(".journal-multiple").select2("data");
            for (var i = 0; i < journal_list.length; i++) {
                journal_ids.push(parseInt(journal_list[i].id));
            }
            output.journal_ids = journal_ids;
            var analytic_ids = [];
            var analytic_list = $(".analytic-multiple").select2("data");
            for (var i = 0; i < analytic_list.length; i++) {
                analytic_ids.push(parseInt(analytic_list[i].id));
            }
            output.analytic_ids = analytic_ids;
            if ($(".date_filter-multiple").select2("data").length === 1) {
                output.date_range = $(".date_filter-multiple").select2("data")[0].id;
            }
            var options_list = $(".extra-multiple").select2("data");
            for (var i = 0; i < options_list.length; i++) {
                if (options_list[i].id === "bal_not_zero") {
                    output.display_accounts = "balance_not_zero";
                }
                if (options_list[i].id === "show_hierarchy") {
                    output.show_hierarchy = true;
                }
            }
            if ($("#date_from").val()) {
                var dateObject = $("#date_from").datepicker("getDate");
                var dateString = $.datepicker.formatDate("yy-mm-dd", dateObject);
                output.date_from = dateString;
            }
            if ($("#date_to").val()) {
                var dateObject = $("#date_to").datepicker("getDate");
                var dateString = $.datepicker.formatDate("yy-mm-dd", dateObject);
                output.date_to = dateString;
            }
            self._rpc({
                model: "ins.trial.balance.aa.account",
                method: "write",
                args: [self.wizard_id, output],
            }).then(function (res) {
                self.plot_data_aa(self.initial_render);
            });
        },
    });
    core.action_registry.add("dynamic.fr.aa", DynamicFrMainAA);
    // Core.action_registry.add('dynamic.gl', DynamicGlMain);
    // core.action_registry.add('dynamic.pa', DynamicPaMain);
    // core.action_registry.add('dynamic.pl', DynamicPlMain);
    core.action_registry.add("dynamic.tb.aa", DynamicTbMainAA);
});
