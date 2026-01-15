import * as assert from 'assert';
import { expect } from 'chai';
import { RosettaParser } from '../../src/parser/RosettaParser';
import * as path from 'path';

suite('RosettaParser Test Suite', () => {
    let parser: RosettaParser;

    setup(() => {
        parser = new RosettaParser();
    });

    suite('Namespace Parsing', () => {
        test('should parse namespace with description', () => {
            const content = 'namespace cdm.base : <"Base types for CDM">';
            const result = parser.parse(content);

            expect(result.file.namespace).to.exist;
            expect(result.file.namespace?.name).to.equal('cdm.base');
            expect(result.file.namespace?.description).to.equal('Base types for CDM');
        });

        test('should parse namespace without description', () => {
            const content = 'namespace cdm.base';
            const result = parser.parse(content);

            expect(result.file.namespace).to.exist;
            expect(result.file.namespace?.name).to.equal('cdm.base');
        });

        test('should handle missing namespace', () => {
            const content = 'type Party : <"Party definition"> {}';
            const result = parser.parse(content);

            expect(result.file.namespace).to.be.undefined;
        });
    });

    suite('Import Parsing', () => {
        test('should parse simple import', () => {
            const content = 'import cdm.base.Party';
            const result = parser.parse(content);

            expect(result.file.imports).to.have.lengthOf(1);
            expect(result.file.imports[0].path).to.equal('cdm.base.Party');
            expect(result.file.imports[0].isWildcard).to.be.false;
        });

        test('should parse wildcard import', () => {
            const content = 'import cdm.base.*';
            const result = parser.parse(content);

            expect(result.file.imports).to.have.lengthOf(1);
            expect(result.file.imports[0].path).to.equal('cdm.base.*');
            expect(result.file.imports[0].isWildcard).to.be.true;
        });

        test('should parse multiple imports', () => {
            const content = `
                import cdm.base.Party
                import cdm.event.*
                import cdm.product.Asset
            `;
            const result = parser.parse(content);

            expect(result.file.imports).to.have.lengthOf(3);
        });
    });

    suite('Type Parsing', () => {
        test('should parse simple type with fields', () => {
            const content = `
                type Party : <"Represents a party in a financial transaction"> {
                    partyId string (1..1) <"Unique party identifier">
                    name string (0..1) <"Party name">
                }
            `;
            const result = parser.parse(content);

            expect(result.file.types).to.have.lengthOf(1);

            const type = result.file.types[0];
            expect(type.name).to.equal('Party');
            expect(type.description).to.equal('Represents a party in a financial transaction');
            expect(type.fields).to.have.lengthOf(2);
        });

        test('should parse type with inheritance', () => {
            const content = `
                type Account extends Party : <"Account definition"> {
                    accountId string (1..1)
                }
            `;
            const result = parser.parse(content);

            expect(result.file.types).to.have.lengthOf(1);
            expect(result.file.types[0].extends).to.equal('Party');
        });

        test('should parse type without description', () => {
            const content = `
                type SimpleType : <""> {
                    field string (1..1)
                }
            `;
            const result = parser.parse(content);

            expect(result.file.types).to.have.lengthOf(1);
        });
    });

    suite('Field Parsing', () => {
        test('should parse field with required single cardinality (1..1)', () => {
            const content = `
                type TestType : <""> {
                    requiredField string (1..1)
                }
            `;
            const result = parser.parse(content);
            const field = result.file.types[0].fields[0];

            expect(field.name).to.equal('requiredField');
            expect(field.type).to.equal('string');
            expect(field.cardinality.min).to.equal(1);
            expect(field.cardinality.max).to.equal(1);
            expect(field.cardinality.isRequired).to.be.true;
            expect(field.cardinality.isMultiple).to.be.false;
        });

        test('should parse field with optional single cardinality (0..1)', () => {
            const content = `
                type TestType : <""> {
                    optionalField string (0..1)
                }
            `;
            const result = parser.parse(content);
            const field = result.file.types[0].fields[0];

            expect(field.cardinality.min).to.equal(0);
            expect(field.cardinality.max).to.equal(1);
            expect(field.cardinality.isRequired).to.be.false;
            expect(field.cardinality.isMultiple).to.be.false;
        });

        test('should parse field with multiple cardinality (0..*)', () => {
            const content = `
                type TestType : <""> {
                    multipleField string (0..*)
                }
            `;
            const result = parser.parse(content);
            const field = result.file.types[0].fields[0];

            expect(field.cardinality.min).to.equal(0);
            expect(field.cardinality.max).to.equal('*');
            expect(field.cardinality.isRequired).to.be.false;
            expect(field.cardinality.isMultiple).to.be.true;
        });

        test('should parse field with required multiple cardinality (1..*)', () => {
            const content = `
                type TestType : <""> {
                    requiredMultiple string (1..*)
                }
            `;
            const result = parser.parse(content);
            const field = result.file.types[0].fields[0];

            expect(field.cardinality.min).to.equal(1);
            expect(field.cardinality.max).to.equal('*');
            expect(field.cardinality.isRequired).to.be.true;
            expect(field.cardinality.isMultiple).to.be.true;
        });

        test('should parse field with description', () => {
            const content = `
                type TestType : <""> {
                    describedField string (1..1) <"This is a field description">
                }
            `;
            const result = parser.parse(content);
            const field = result.file.types[0].fields[0];

            expect(field.description).to.equal('This is a field description');
        });

        test('should parse field with complex type', () => {
            const content = `
                type TestType : <""> {
                    complexField PartyRole (0..1)
                }
            `;
            const result = parser.parse(content);
            const field = result.file.types[0].fields[0];

            expect(field.type).to.equal('PartyRole');
        });
    });

    suite('Enum Parsing', () => {
        test('should parse simple enum', () => {
            const content = `
                enum AccountTypeEnum : <"Types of accounts"> {
                    CLIENT
                    HOUSE
                }
            `;
            const result = parser.parse(content);

            expect(result.file.enums).to.have.lengthOf(1);

            const enumDef = result.file.enums[0];
            expect(enumDef.name).to.equal('AccountTypeEnum');
            expect(enumDef.description).to.equal('Types of accounts');
            expect(enumDef.values).to.have.lengthOf(2);
        });

        test('should parse enum with display names', () => {
            const content = `
                enum StatusEnum : <"Status values"> {
                    ACTIVE displayName "Active Status"
                    INACTIVE displayName "Inactive Status"
                }
            `;
            const result = parser.parse(content);
            const values = result.file.enums[0].values;

            expect(values[0].name).to.equal('ACTIVE');
            expect(values[0].displayName).to.equal('Active Status');
            expect(values[1].name).to.equal('INACTIVE');
            expect(values[1].displayName).to.equal('Inactive Status');
        });

        test('should parse enum with descriptions', () => {
            const content = `
                enum ColorEnum : <""> {
                    RED <"Red color">
                    BLUE <"Blue color">
                }
            `;
            const result = parser.parse(content);
            const values = result.file.enums[0].values;

            expect(values[0].description).to.equal('Red color');
            expect(values[1].description).to.equal('Blue color');
        });
    });

    suite('File Parsing', () => {
        test('should parse sample fixture file', () => {
            const fixturePath = path.resolve(__dirname, '../fixtures/sample.rosetta');
            const result = parser.parseFile(fixturePath);

            expect(result.errors).to.be.empty;
            expect(result.file.filePath).to.equal(fixturePath);
        });

        test('should handle parse errors gracefully', () => {
            const invalidContent = 'this is not valid rosetta syntax @#$%';
            const result = parser.parse(invalidContent);

            // Should not throw, but return a result with potentially empty content
            expect(result).to.exist;
            expect(result.file).to.exist;
        });
    });

    suite('Version Parsing', () => {
        test('should parse version declaration', () => {
            const content = `
                namespace cdm.base : <"Base types">
                version "5.0.0"
            `;
            const result = parser.parse(content);

            expect(result.file.namespace?.version).to.equal('5.0.0');
        });
    });

    suite('Multiple Types and Enums', () => {
        test('should parse multiple types in one file', () => {
            const content = `
                type Party : <""> {
                    partyId string (1..1)
                }

                type Account : <""> {
                    accountId string (1..1)
                }
            `;
            const result = parser.parse(content);

            expect(result.file.types).to.have.lengthOf(2);
            expect(result.file.types[0].name).to.equal('Party');
            expect(result.file.types[1].name).to.equal('Account');
        });

        test('should parse mixed types and enums', () => {
            const content = `
                type Party : <""> {
                    status StatusEnum (1..1)
                }

                enum StatusEnum : <""> {
                    ACTIVE
                    INACTIVE
                }
            `;
            const result = parser.parse(content);

            expect(result.file.types).to.have.lengthOf(1);
            expect(result.file.enums).to.have.lengthOf(1);
        });
    });
});
